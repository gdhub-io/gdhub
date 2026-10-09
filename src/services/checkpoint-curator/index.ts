/**
 * The AI curator.
 *
 * Four calls the checkpoint makes on its own, at most six per checkpoint: the
 * day-1 goal check, an answer under each of the first three devlogs, the day-15
 * note, and the day-28 report. The fourth devlog's answer would land on day 28
 * beside the report, so it is folded into the report instead.
 *
 * A fifth is pressed by the author while the card is a draft — suggested lines
 * for one side of it — and may be pressed twice or never.
 *
 * Shaped like `src/services/ai-validation`: typed in, typed out, prompts in
 * their own folder, a forced tool call, and nothing anywhere that parses prose.
 * Every call returns `null` when the model fails — what that means is the
 * caller's to decide, and it differs: a missing devlog answer is a shrug, a
 * missing report must not close a checkpoint.
 *
 * What the model is shown is only ever what the platform could already show the
 * author. The verdict it proposes is settled by `settleVerdict`, in code.
 */

import { isValidJSON } from "@/helpers/format";
import {
	DEVLOG_ANSWER_FUNCTION_NAME,
	devlogAnswerMessages,
	devlogAnswerSchema,
} from "./prompts/devlog-answer";
import {
	GOAL_CHECK_FUNCTION_NAME,
	goalCheckMessages,
	goalCheckSchema,
} from "./prompts/goal-check";
import {
	MID_NOTE_FUNCTION_NAME,
	midNoteMessages,
	midNoteSchema,
} from "./prompts/mid-note";
import {
	REPORT_FUNCTION_NAME,
	reportMessages,
	reportSchema,
} from "./prompts/report";
import {
	SUGGEST_LINES_FUNCTION_NAME,
	suggestLinesMessages,
	suggestLinesSchema,
} from "./prompts/suggest-lines";
import type {
	CuratorOptions,
	DevlogAnswerInput,
	DevlogAnswerResult,
	GoalCheckInput,
	GoalCheckResult,
	MidNoteInput,
	MidNoteResult,
	ReportInput,
	ReportResult,
	SuggestLinesInput,
	SuggestLinesResult,
} from "./types";

type Message = { role: "system" | "user"; content: string };

class CheckpointCuratorService {
	private get model() {
		return (
			process.env.CHECKPOINT_CURATOR_MODEL ||
			process.env.OPENAI_API_MODEL ||
			"gpt-5.6-luna"
		);
	}

	/**
	 * One forced tool call. The model is given exactly one function and no choice
	 * about calling it, so there is never a prose answer to fall back to reading.
	 */
	private async call<T>(
		name: string,
		parameters: Record<string, unknown>,
		messages: Message[],
	): Promise<T | null> {
		try {
			// Lazy: constructing the OpenAI client needs OPENAI_API_KEY, and the
			// cron route must stay loadable without one.
			const { openAI } = await import("@/services/openai");
			const completion = await openAI.openai.chat.completions.create({
				model: this.model,
				messages,
				tools: [{ type: "function", function: { name, parameters } }],
				tool_choice: { type: "function", function: { name } },
				temperature: 0,
			});

			const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
			const args =
				toolCall?.type === "function" ? toolCall.function.arguments : undefined;

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

	/** Day 1: is this reachable in 28 days, and what is missing from the list. */
	checkGoal(input: GoalCheckInput, options: CuratorOptions = {}) {
		return this.call<GoalCheckResult>(
			GOAL_CHECK_FUNCTION_NAME,
			goalCheckSchema(input),
			goalCheckMessages(input, options.locale),
		);
	}

	/** The day after a devlog: what it moves, what it leaves untouched. */
	answerDevlog(input: DevlogAnswerInput, options: CuratorOptions = {}) {
		return this.call<DevlogAnswerResult>(
			DEVLOG_ANSWER_FUNCTION_NAME,
			devlogAnswerSchema(input),
			devlogAnswerMessages(input, options.locale),
		);
	}

	/** Day 15: the unclaimed outcomes and the question. Never the cut. */
	writeMidNote(input: MidNoteInput, options: CuratorOptions = {}) {
		return this.call<MidNoteResult>(
			MID_NOTE_FUNCTION_NAME,
			midNoteSchema(),
			midNoteMessages(input, options.locale),
		);
	}

	/** Day 28: the report and a proposed verdict, settled by the guardrail. */
	writeReport(input: ReportInput, options: CuratorOptions = {}) {
		return this.call<ReportResult>(
			REPORT_FUNCTION_NAME,
			reportSchema(),
			reportMessages(input, options.locale),
		);
	}

	/** While the card is a draft: lines for one side of it, on demand. */
	suggestLines(input: SuggestLinesInput, options: CuratorOptions = {}) {
		return this.call<SuggestLinesResult>(
			SUGGEST_LINES_FUNCTION_NAME,
			suggestLinesSchema(input),
			suggestLinesMessages(input, options.locale),
		);
	}
}

export const checkpointCurator = new CheckpointCuratorService();

export type * from "./types";
