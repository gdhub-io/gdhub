/**
 * AI validation service.
 *
 * Reusable, form-agnostic content checks intended to run once, on save (e.g.
 * when the user presses "Next" in onboarding). Two checks run in parallel and
 * cost at most two OpenAI requests per call:
 *
 *   1. Moderation  — OpenAI's free Moderation API flags offensive / unsafe /
 *      forbidden content across ALL fields in a single batched request.
 *   2. Relevance   — a single cheap chat completion decides whether each value
 *      actually belongs in its field (a speciality contains a speciality, a
 *      name contains a name, not "asdf" or "I love swimming").
 *
 * Design goals: fast, cheap, minimal requests, and universal — point it at any
 * set of fields from any form. It fails OPEN: if OpenAI errors or times out the
 * user is never blocked (the failure is logged and the check is skipped).
 *
 * To move the relevance check to another provider (e.g. Claude), replace
 * `checkRelevance` — the public `validate` contract stays the same.
 */

import { env } from "@/helpers/env";
import { isValidJSON } from "@/helpers/format";
import { FIELD_KINDS } from "./prompts/field-kinds";
import {
	buildRelevanceMessages,
	buildRelevanceSchema,
	RELEVANCE_FUNCTION_NAME,
} from "./prompts/relevance";
import type {
	FieldInput,
	FieldIssue,
	ValidateOptions,
	ValidationResult,
} from "./types";

const emptyResult = (): ValidationResult => ({
	ok: true,
	issues: [],
	errors: [],
	warnings: [],
});

/** Coerce arbitrary form values (strings, arrays, objects) into plain text. */
export function toValidationText(value: unknown): string {
	if (value == null) return "";
	if (Array.isArray(value)) return value.filter(Boolean).join("\n");
	if (typeof value === "object") return JSON.stringify(value);
	return String(value);
}

type RelevanceVerdict = {
	key: string;
	relevant: boolean;
	reason: "ok" | "irrelevant" | "gibberish";
};

class AiValidationService {
	private get enabled() {
		return env<string>("AI_VALIDATION_ENABLED", "true") !== "false";
	}

	private get moderationModel() {
		return env<string>(
			"AI_VALIDATION_MODERATION_MODEL",
			"omni-moderation-latest",
		);
	}

	private get relevanceModel() {
		return (
			process.env.AI_VALIDATION_RELEVANCE_MODEL ||
			process.env.OPENAI_API_MODEL ||
			"gpt-4.1-mini"
		);
	}

	/**
	 * Validate a set of fields. Empty fields are ignored. Returns per-field
	 * issues split into blocking `errors` and advisory `warnings`.
	 */
	async validate(
		fields: FieldInput[],
		options: ValidateOptions = {},
	): Promise<ValidationResult> {
		const active = fields.filter((f) => f.value?.trim().length);
		if (!this.enabled || active.length === 0) return emptyResult();

		const [moderationIssues, relevanceIssues] = await Promise.all([
			this.moderate(active),
			this.checkRelevance(active, options),
		]);

		// One issue per field; a moderation hit takes priority over relevance.
		const byKey = new Map<string, FieldIssue>();
		for (const issue of relevanceIssues) byKey.set(issue.key, issue);
		for (const issue of moderationIssues) byKey.set(issue.key, issue);

		const issues = [...byKey.values()];
		const errors = issues.filter((i) => i.severity === "error");
		const warnings = issues.filter((i) => i.severity === "warning");

		return { ok: errors.length === 0, issues, errors, warnings };
	}

	/** Batched moderation: one request covering every field. */
	private async moderate(fields: FieldInput[]): Promise<FieldIssue[]> {
		try {
			// Lazy import: constructing the OpenAI client requires OPENAI_API_KEY.
			// Importing it here (not at module load) keeps the routes that use this
			// service loadable without a key, and lets a missing key fail open.
			const { openAI } = await import("@/services/openai");
			const inputs = fields.map((f) => f.value.replace(/\n/g, " "));
			const response = await openAI.openai.moderations.create({
				model: this.moderationModel,
				input: inputs,
			});

			const issues: FieldIssue[] = [];
			response.results.forEach((result, index) => {
				if (!result.flagged) return;
				const field = fields[index];
				const categories = Object.entries(result.categories)
					.filter(([, on]) => on)
					.map(([name]) => name);

				issues.push({
					key: field.key,
					severity: "error", // offensive / forbidden content always blocks
					reason: "moderation",
					messageKey: "validation.moderation",
					message:
						"This text contains language that isn't allowed here. Please rephrase it.",
					categories,
				});
			});

			return issues;
		} catch (error) {
			console.error("[ai-validation] moderation failed (fail-open):", error);
			return [];
		}
	}

	/** Batched relevance check: one chat completion covering every field. */
	private async checkRelevance(
		fields: FieldInput[],
		options: ValidateOptions,
	): Promise<FieldIssue[]> {
		const toCheck = fields.filter((f) => !f.skipRelevance);
		if (toCheck.length === 0) return [];

		try {
			const { openAI } = await import("@/services/openai");
			const completion = await openAI.openai.chat.completions.create({
				model: this.relevanceModel,
				messages: buildRelevanceMessages(toCheck, options.locale ?? "en"),
				tools: [
					{
						type: "function",
						function: {
							name: RELEVANCE_FUNCTION_NAME,
							parameters: buildRelevanceSchema(toCheck),
						},
					},
				],
				tool_choice: {
					type: "function",
					function: { name: RELEVANCE_FUNCTION_NAME },
				},
				temperature: 0,
			});

			const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
			const args =
				toolCall?.type === "function" ? toolCall.function.arguments : undefined;
			if (!isValidJSON(args)) return [];

			const parsed = JSON.parse(args as string) as {
				fields?: RelevanceVerdict[];
			};
			const verdicts = parsed.fields ?? [];

			const issues: FieldIssue[] = [];
			for (const verdict of verdicts) {
				if (verdict.relevant || verdict.reason === "ok") continue;

				const field = toCheck.find((f) => f.key === verdict.key);
				if (!field) continue;

				const severity =
					field.severity ?? FIELD_KINDS[field.kind].defaultSeverity;
				const label = field.label ?? field.key;

				issues.push(
					verdict.reason === "gibberish"
						? {
								key: field.key,
								severity,
								reason: "gibberish",
								messageKey: "validation.gibberish",
								message: `"${label}" looks like random or meaningless text. Please review it.`,
							}
						: {
								key: field.key,
								severity,
								reason: "irrelevant",
								messageKey: "validation.irrelevant",
								message: `This doesn't look like a valid "${label}". Please review it.`,
							},
				);
			}

			return issues;
		} catch (error) {
			console.error("[ai-validation] relevance failed (fail-open):", error);
			return [];
		}
	}
}

const globalForAiValidation = globalThis as unknown as {
	aiValidation: AiValidationService | undefined;
};

export const aiValidation =
	globalForAiValidation.aiValidation ?? new AiValidationService();

export type {
	FieldInput,
	FieldIssue,
	FieldKind,
	FieldSeverity,
	ValidationResult,
} from "./types";
