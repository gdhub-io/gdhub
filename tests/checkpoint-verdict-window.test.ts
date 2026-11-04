import { describe, expect, it } from "vitest";
import { dueDateFrom } from "@/lib/checkpoints/days";
import {
	verdictDraftOpensAt,
	verdictDueBy,
	verdictOverdue,
	verdictSendOpensAt,
	verdictStage,
} from "@/lib/checkpoints/verdict-window";

// Started 1 Sep late in the evening UTC: day 28 is 28 Sep, the final call 29 Sep.
const startedAt = new Date("2026-09-01T21:30:00.000Z");
const dueAt = dueDateFrom(startedAt);

describe("the verdict's deadline", () => {
	it("is three days after day 28, whatever hour the checkpoint started", () => {
		expect(verdictDueBy(dueAt).toISOString()).toBe("2026-10-01T00:00:00.000Z");
	});

	it("is not overdue until the due day has ended", () => {
		expect(verdictOverdue(dueAt, new Date("2026-10-01T23:59:00.000Z"))).toBe(
			false,
		);
		expect(verdictOverdue(dueAt, new Date("2026-10-02T00:00:00.000Z"))).toBe(
			true,
		);
	});
});

describe("when the curator may write", () => {
	const call = {
		scheduledAt: "2026-09-29T15:00:00.000Z",
		curatorJoinedAt: null,
	};

	it("opens the draft on the first day of sprint 4", () => {
		expect(verdictDraftOpensAt(startedAt).toISOString()).toBe(
			"2026-09-22T00:00:00.000Z",
		);
		expect(verdictStage(startedAt, call, new Date("2026-09-21T23:00:00Z"))).toBe(
			"early",
		);
		expect(verdictStage(startedAt, call, new Date("2026-09-22T00:00:00Z"))).toBe(
			"draft",
		);
	});

	it("keeps the call's own day to a draft until the call starts", () => {
		expect(verdictStage(startedAt, call, new Date("2026-09-29T14:59:00Z"))).toBe(
			"draft",
		);
		expect(verdictStage(startedAt, call, new Date("2026-09-29T15:00:00Z"))).toBe(
			"send",
		);
	});

	it("opens sending when the curator joins a call early", () => {
		const joined = { ...call, curatorJoinedAt: "2026-09-29T14:50:00.000Z" };

		expect(verdictSendOpensAt(startedAt, joined).toISOString()).toBe(
			"2026-09-29T14:50:00.000Z",
		);
	});

	it("opens at the start of day 29 when no call was written down", () => {
		expect(verdictSendOpensAt(startedAt, null).toISOString()).toBe(
			"2026-09-29T00:00:00.000Z",
		);
	});
});
