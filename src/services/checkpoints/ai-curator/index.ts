/**
 * The AI curator.
 *
 * Three calls the checkpoint makes on its own: the day-1 goal check, the day-15
 * note, and the day-28 report. Curators do not answer devlogs in writing.
 *
 * A fourth is pressed by the author while the card is a draft — suggested lines
 * for one side of it — and may be pressed twice or never.
 *
 * Typed in, typed out, prompts in their own folder, a structured answer held
 * to the prompt's JSON schema, and nothing anywhere that parses prose.
 * Every call returns `null` when the model fails — what that means is the
 * caller's to decide, and it differs: a missing note is a shrug, a missing
 * report must not close a checkpoint.
 *
 * What the model is shown is only ever what the platform could already show the
 * author. The verdict it proposes is settled by `settleVerdict`, in code.
 */

import { jsonSchema } from "ai";
import type { AiMeter, AiPurpose } from "@/services/ai-usage";
import { runStructured } from "@/services/checkpoints/ai-review";
import type {
	CuratorOptions,
	GoalCheckInput,
	GoalCheckResult,
	ReportInput,
	ReportResult,
} from "@/types/checkpoint-curator";
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

const meter = (options: CuratorOptions, purpose: AiPurpose) =>
	options.checkpointId
		? { checkpointId: options.checkpointId, purpose }
		: undefined;

class CheckpointCuratorService {
	/** One structured answer held to the prompt's schema; null when the model fails. */
	private async call<T>(
		name: string,
		parameters: Record<string, unknown>,
		[system, user]: { content: string }[],
		meter?: AiMeter,
	): Promise<T | null> {
		try {
			return await runStructured(
				name,
				jsonSchema<T>(parameters),
				{ instructions: system.content, prompt: user.content },
				meter,
			);
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
			meter(options, options.purpose ?? "goalCheck"),
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

export type * from "@/types/checkpoint-curator";
