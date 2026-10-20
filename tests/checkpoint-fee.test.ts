import { describe, expect, it } from "vitest";
import { CheckpointCuratorKind, CheckpointFeeReason } from "@/config/prisma-enums";
import {
	aiCostMicros,
	callCost,
	curatorFee,
	payoutDueOn,
} from "@/lib/checkpoint-costs";
import { type FeeCase, feeFor } from "@/lib/checkpoint-fee";

const calls = (held: number[]) =>
	[1, 2, 3, 4, 5].map((index) => ({
		index,
		curatorJoinedAt: held.includes(index) ? new Date("2026-10-01") : null,
	}));

const closed = (over: Partial<FeeCase> = {}): FeeCase => ({
	curatorKind: CheckpointCuratorKind.Human,
	curatorId: "c1",
	decidedById: "c1",
	verdictSent: true,
	paid: 45000,
	refundReason: null,
	sessions: calls([1, 2, 3, 4, 5]),
	tookOverAt: null,
	...over,
});

describe("the curator's fee", () => {
	it("is 70% of what was paid for a whole checkpoint", () => {
		expect(feeFor(closed())).toEqual({
			curatorId: "c1",
			parts: 6,
			amount: 31500,
			reason: CheckpointFeeReason.Full,
		});
	});

	it("follows a promotion code down with the price", () => {
		expect(feeFor(closed({ paid: 36000 }))?.amount).toBe(25200);
	});

	it("is nothing for the AI, a curator who stopped, or an admin's verdict", () => {
		expect(feeFor(closed({ curatorKind: CheckpointCuratorKind.AI }))).toBeNull();
		expect(
			feeFor(closed({ verdictSent: false, refundReason: "curatorGone" })),
		).toBeNull();
		expect(
			feeFor(closed({ verdictSent: false, refundReason: "noVerdict" })),
		).toBeNull();
		expect(feeFor(closed({ decidedById: "admin1" }))).toBeNull();
	});

	it("pays the calls held when the author withdraws", () => {
		expect(
			feeFor(
				closed({
					verdictSent: false,
					decidedById: null,
					refundReason: "withdrawal",
					sessions: calls([1, 2]),
				}),
			),
		).toEqual({
			curatorId: "c1",
			parts: 2,
			amount: 10500,
			reason: CheckpointFeeReason.RefundReduced,
		});
	});

	it("pays a replacement from the call they took over, the earlier ones to nobody", () => {
		expect(feeFor(closed({ tookOverAt: 4 }))).toEqual({
			curatorId: "c1",
			parts: 3,
			amount: 15750,
			reason: CheckpointFeeReason.Replacement,
		});
	});

	it("rounds down", () => {
		expect(curatorFee(29999, 6)).toBe(20999);
	});
});

describe("running cost", () => {
	it("prices video by person-minute, recording and transcript by call minute", () => {
		const cost = callCost([
			{
				participantMinutes: 200,
				curatorJoinedAt: "2026-10-01T10:00:00Z",
				endedAt: "2026-10-01T10:50:00Z",
			},
			{ participantMinutes: null, curatorJoinedAt: null, endedAt: null },
		]);
		expect(cost.personMinutes).toBe(200);
		expect(cost.minutes).toBe(50);
		expect(cost.video).toBeCloseTo(80);
		expect(cost.recording + cost.transcript).toBeCloseTo(46.5);
	});

	it("prices tokens per million, and refuses a model it has no price for", () => {
		expect(aiCostMicros("gpt-6-sol", 1_000, 500)).toBe(7_000);
		expect(aiCostMicros("unknown-model", 1_000, 500)).toBeNull();
	});

	it("makes a month's fees due on the 15th of the next one", () => {
		expect(payoutDueOn("2026-12-01T00:00:00Z").toISOString()).toBe(
			"2027-01-15T00:00:00.000Z",
		);
	});
});
