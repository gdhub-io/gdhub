import { aiCostMicros } from "@/lib/checkpoint-costs";
import { prisma } from "@/services/prisma";

/** Every AI task run for a checkpoint, as its usage row names it. */
export type AiPurpose =
	| "goalCheck"
	| "suggestLines"
	| "midNote"
	| "report"
	| "callNotes"
	| "planAdvice"
	| "sprintReview"
	| "evidence";

/** Which checkpoint an AI call is charged to, and for what. */
export type AiMeter = { checkpointId: string; purpose: AiPurpose };

/**
 * Records the tokens a call spent, priced now. Never throws: a missed row
 * costs a few cents of reporting, a thrown one would cost the answer.
 */
export const recordAiUsage = async (
	meter: AiMeter | undefined,
	model: string,
	usage: { inputTokens?: number | null; outputTokens?: number | null },
) => {
	if (!meter) return;

	const inputTokens = usage.inputTokens ?? 0;
	const outputTokens = usage.outputTokens ?? 0;
	const cost = aiCostMicros(model, inputTokens, outputTokens);
	if (cost === null) console.warn(`[ai-usage] no price for model ${model}`);

	await prisma.checkpointAiUsage
		.create({
			data: { ...meter, model, inputTokens, outputTokens, cost: cost ?? 0 },
		})
		.catch((error) =>
			console.error("[ai-usage] not recorded", meter.checkpointId, error),
		);
};
