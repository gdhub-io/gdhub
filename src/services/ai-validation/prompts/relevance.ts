/**
 * Prompt + JSON schema for the batched relevance check.
 *
 * The whole check runs as ONE chat completion for all fields, keeping the cost
 * to a single cheap request per form step. Edit the system prompt below to tune
 * how strict the model is; edit `field-kinds.ts` to tune per-field expectations.
 */

import { stripIndents } from "common-tags";
import type { FieldInput } from "../types";
import { FIELD_KINDS } from "./field-kinds";

export const RELEVANCE_FUNCTION_NAME = "report_field_relevance";

/** JSON schema for the model's structured answer (one verdict per field). */
export function buildRelevanceSchema(fields: FieldInput[]) {
	return {
		type: "object",
		properties: {
			fields: {
				type: "array",
				items: {
					type: "object",
					properties: {
						key: {
							type: "string",
							enum: fields.map((f) => f.key),
						},
						relevant: {
							type: "boolean",
							description:
								"true if the value matches what the field should contain",
						},
						reason: {
							type: "string",
							enum: ["ok", "irrelevant", "gibberish"],
						},
					},
					required: ["key", "relevant", "reason"],
				},
			},
		},
		required: ["fields"],
	};
}

export function buildRelevanceMessages(fields: FieldInput[], locale = "en") {
	const fieldList = fields
		.map(
			(f) =>
				stripIndents`
			- key: "${f.key}"
			  field name: "${f.label ?? f.key}"
			  expected content: ${FIELD_KINDS[f.kind].expectation}
			  user value: """${f.value}"""
		`,
		)
		.join("\n\n");

	return [
		{
			role: "system" as const,
			content: stripIndents`
			You are a strict form-validation assistant for a game-development
			platform. For each field, decide whether the user's value plausibly
			matches the "expected content" described for that field.

			Rules:
			- Reason "gibberish" (relevant: false) for keyboard mashing, random
			  characters, or meaningless filler (e.g. "asdf", "qwerty", "123456",
			  "aaaaa", "test test").
			- Reason "irrelevant" (relevant: false) when the text is real language
			  but does not belong in this field (e.g. "I love swimming" in a job
			  title field).
			- Reason "ok" (relevant: true) for anything that reasonably fits, in ANY
			  language or script. Be tolerant of short but valid answers and of
			  personal names written in any alphabet.
			- Judge ONLY topical relevance to the field. Never judge grammar,
			  spelling, style, or quality.
			- Do NOT flag offensive or unsafe content here — that is handled by a
			  separate moderation step.

			The user's interface language is "${locale}".
		`,
		},
		{
			role: "user" as const,
			content: stripIndents`
			Validate these fields and answer via the ${RELEVANCE_FUNCTION_NAME}
			function with exactly one entry per field key.

			Fields:
			${fieldList}
		`,
		},
	];
}
