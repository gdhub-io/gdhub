import {
	AI_MODEL_PRICES,
	CHECKPOINT_MINOR_UNITS,
	CHECKPOINT_PARTS,
	DAILY_RECORDING_RATE,
	DAILY_TRANSCRIPT_RATE,
	DAILY_VIDEO_RATE,
	PAYOUT_DUE_DAY,
	PLATFORM_SHARE,
} from "@/config/checkpoint";
import type { PayoutStatus } from "@/types/checkpoints";

/**
 * What a checkpoint costs to run and what its curator earns, in one place for
 * the admin list, the payouts and the curator's earnings. Browser-safe.
 */

/** AI costs are kept in micro-dollars: one call costs a fraction of a cent. */
export const MICROS_PER_USD = 1_000_000;

/** Null for a model with no price in config. */
export const aiCostMicros = (
	model: string,
	inputTokens: number,
	outputTokens: number,
) => {
	const price = AI_MODEL_PRICES[model];
	if (!price) return null;

	// Prices are per million tokens, so tokens × price is already micro-dollars.
	return Math.round(inputTokens * price.input + outputTokens * price.output);
};

/** The curator's fee for the parts they delivered, rounded down (Expert Services Terms §3). */
export const curatorFee = (paid: number, parts: number) => {
	// In whole percent: 1 − 0.3 is 0.6999… in floating point, a cent short.
	const percent = Math.round((1 - PLATFORM_SHARE) * 100);
	return Math.floor((paid * parts * percent) / (CHECKPOINT_PARTS.Human * 100));
};

type CallUsage = {
	participantMinutes: number | null;
	curatorJoinedAt: Date | string | null;
	endedAt: Date | string | null;
};

/** Minutes the room was recorded and transcribed: from the curator's join to the end. */
const callMinutes = ({ curatorJoinedAt, endedAt }: CallUsage) =>
	curatorJoinedAt && endedAt
		? Math.max(
				0,
				Math.ceil(
					(new Date(endedAt).getTime() - new Date(curatorJoinedAt).getTime()) /
						60_000,
				),
			)
		: 0;

/** What calls cost, in minor units, with the parts the tooltip lists. */
export const callPrice = (personMinutes: number, minutes: number) => {
	const toMinor = (usd: number) => usd * CHECKPOINT_MINOR_UNITS;
	const video = toMinor(personMinutes * DAILY_VIDEO_RATE);
	const recording = toMinor(minutes * DAILY_RECORDING_RATE);
	const transcript = toMinor(minutes * DAILY_TRANSCRIPT_RATE);

	return {
		personMinutes,
		minutes,
		video,
		recording,
		transcript,
		total: video + recording + transcript,
	};
};

export const callCost = (calls: CallUsage[]) =>
	callPrice(
		calls.reduce((sum, call) => sum + (call.participantMinutes ?? 0), 0),
		calls.reduce((sum, call) => sum + callMinutes(call), 0),
	);

export const microsToMinor = (micros: number) =>
	(micros / MICROS_PER_USD) * CHECKPOINT_MINOR_UNITS;

/** What the platform keeps of a checkpoint, in minor units. */
export const checkpointMargin = ({
	paid,
	refunded,
	fee,
	calls,
	ai,
}: {
	paid: number;
	refunded: number;
	fee: number;
	calls: number;
	ai: number;
}) => paid - refunded - fee - calls - ai;

/** The first day of `at`'s month, UTC. */
export const monthOf = (at: Date | string) => {
	const date = new Date(at);
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
};

export const nextMonth = (month: Date) =>
	new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1));

/** The first day of the month before `now`'s, UTC. */
export const previousMonth = (now: Date) =>
	new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

/** The day a month's fees are due by: the PAYOUT_DUE_DAY of the next month. */
export const payoutDueOn = (month: Date | string) => {
	const date = new Date(month);
	return new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, PAYOUT_DUE_DAY),
	);
};

export const payoutStatus = (
	month: Date,
	paid: boolean,
	now: Date,
): PayoutStatus => {
	if (paid) return "paid";
	if (monthOf(now) <= month) return "notDue";
	return now > payoutDueOn(month) ? "late" : "due";
};
