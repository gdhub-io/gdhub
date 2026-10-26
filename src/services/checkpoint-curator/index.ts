/**
 * The AI curator.
 *
 * Three calls the checkpoint makes on its own: the day-1 goal check, the day-15
 * note, and the day-28 report. Curators do not answer devlogs in writing.
 *
 * A fourth is pressed by the author while the card is a draft — suggested lines
 * for one side of it — and may be pressed twice or never.
 *
 * Shaped like `src/services/ai-validation`: typed in, typed out, prompts in
 * their own folder, a forced tool call, and nothing anywhere that parses prose.
 * Every call returns `null` when the model fails — what that means is the
 * caller's to decide, and it differs: a missing note is a shrug, a missing
 * report must not close a checkpoint.
 *
 * What the model is shown is only ever what the platform could already show the
 * author. The verdict it proposes is settled by `settleVerdict`, in code.
 */

import { AI_MODELS } from "@/config/ai-models";
import { isValidJSON } from "@/helpers/format";
import { traceAiCall } from "@/services/ai-trace";
import {
	type AiMeter,
	type AiPurpose,
	recordAiUsage,
} from "@/services/ai-usage";
import {
	GOAL_CHECK_FUNCTION_NAME,
	goalCheckMessages,
	goalCheckSchema,
} from "./prompts/goal-check";
import {
	REPORT_FUNCTION_NAME,
	reportMessages,
	reportSchema,
} from "./prompts/report";
import type {
	CuratorOptions,
	GoalCheckInput,
	GoalCheckResult,
	ReportInput,
	ReportResult,
} from "./types";

type Message = { role: "system" | "user"; content: string };

const meter = (options: CuratorOptions, purpose: AiPurpose) =>
	options.checkpointId
		? { checkpointId: options.checkpointId, purpose }
		: undefined;

class CheckpointCuratorService {
	get model() {
		return process.env.CHECKPOINT_CURATOR_MODEL || AI_MODELS.curatorAssist;
	}

	/**
	 * One forced tool call. The model is given exactly one function and no choice
	 * about calling it, so there is never a prose answer to fall back to reading.
	 */
	private async call<T>(
		name: string,
		parameters: Record<string, unknown>,
		messages: Message[],
		meter?: AiMeter,
	): Promise<T | null> {
		try {
			// Lazy: constructing the OpenAI client needs OPENAI_API_KEY, and the
			// cron route must stay loadable without one.
			const { openAI } = await import("@/services/openai");
			const started = Date.now();
			const completion = await openAI.openai.chat.completions.create({
				model: this.model,
				messages,
				tools: [{ type: "function", function: { name, parameters } }],
				tool_choice: { type: "function", function: { name } },
				// The GPT-6 models refuse function tools on chat completions while
				// reasoning is on.
				reasoning_effort: "none",
				temperature: 0,
			});
			await recordAiUsage(meter, this.model, {
				inputTokens: completion.usage?.prompt_tokens,
				outputTokens: completion.usage?.completion_tokens,
			});

			const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
			const args =
				toolCall?.type === "function" ? toolCall.function.arguments : undefined;
			traceAiCall(() => ({
				name,
				model: this.model,
				system: messages.find((m) => m.role === "system")?.content ?? "",
				messages: messages.filter((m) => m.role !== "system"),
				raw: args ?? null,
				inputTokens: completion.usage?.prompt_tokens ?? 0,
				outputTokens: completion.usage?.completion_tokens ?? 0,
				ms: Date.now() - started,
			}));

			if (!isValidJSON(args)) {
				console.error(`[checkpoint-curator] ${name} answered no usable JSON`);

				return null;
			}

			return JSON.parse(args as string) as T;
		} catch (error) {
			console.error(`[checkpoint-curator] ${name} failed:`, error);

			return null;
		}
	}

	/** Day 1: does the goal fit 28 days, and which tasks to start from. */
	checkGoal(input: GoalCheckInput, options: CuratorOptions = {}) {
		return this.call<GoalCheckResult>(
			GOAL_CHECK_FUNCTION_NAME,
			goalCheckSchema(),
			goalCheckMessages(input, options.locale),
			meter(options, "goalCheck"),
		);
	}

	/** Day 28: the report and a proposed verdict, settled by the guardrail. */
	writeReport(input: ReportInput, options: CuratorOptions = {}) {
		return this.call<ReportResult>(
			REPORT_FUNCTION_NAME,
			reportSchema(),
			reportMessages(input, options.locale),
			meter(options, options.purpose ?? "report"),
		);
	}
}

export const checkpointCurator = new CheckpointCuratorService();

export type * from "./types";
