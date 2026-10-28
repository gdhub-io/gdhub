import { describe, expect, it } from "vitest";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import { sessionDay } from "@/lib/checkpoint-days";
import { buildSessions, currentSessionOf } from "@/lib/checkpoint-sessions";

const startedAt = new Date("2026-10-01T15:30:00Z");

describe("checkpoint sessions", () => {
	it("falls on days 1, 8, 15, 22 and 29", () => {
		expect([1, 2, 3, 4, 5].map(sessionDay)).toEqual([1, 8, 15, 22, 29]);
	});

	it("has none before the checkpoint starts", () => {
		expect(buildSessions(null, [], CheckpointCuratorKind.Human)).toEqual([]);
	});

	it("reads the calendar at UTC midnight when nothing is stored", () => {
		const sessions = buildSessions(startedAt, [], CheckpointCuratorKind.Human);

		expect(sessions.map((session) => session.scheduledAt)).toEqual([
			"2026-10-01T00:00:00.000Z",
			"2026-10-08T00:00:00.000Z",
			"2026-10-15T00:00:00.000Z",
			"2026-10-22T00:00:00.000Z",
			"2026-10-29T00:00:00.000Z",
		]);
		expect(sessions.every((session) => !session.timeKnown)).toBe(true);
	});

	it("takes the stored row, hour and all, over the calendar", () => {
		const moved = new Date("2026-10-09T14:00:00Z");
		const sessions = buildSessions(startedAt, [
			{
				index: 2,
				scheduledAt: moved,
				rescheduledAt: new Date("2026-10-05T09:00:00Z"),
				curatorJoinedAt: null,
				endedAt: null,
				contentStatus: null,
			},
		], CheckpointCuratorKind.Human);

		expect(sessions[1]).toMatchObject({
			index: 2,
			day: 8,
			scheduledAt: moved.toISOString(),
			timeKnown: true,
			rescheduledAt: "2026-10-05T09:00:00.000Z",
		});
		expect(sessions[0].timeKnown).toBe(false);
	});

	describe("missed", () => {
		const row = {
			index: 2,
			scheduledAt: new Date("2026-10-08T14:00:00Z"),
			rescheduledAt: null,
			curatorJoinedAt: null,
			endedAt: null,
			contentStatus: null,
		};
		const later = new Date("2026-10-09T00:00:00Z");

		it("marks a call whose window passed with no curator in it", () => {
			const [, second] = buildSessions(
				startedAt,
				[row],
				CheckpointCuratorKind.Human,
				{ now: later },
			);
			expect(second.missed).toBe(true);
		});

		it("never marks the AI curator's sessions, which nobody joins", () => {
			const [, second] = buildSessions(
				startedAt,
				[row],
				CheckpointCuratorKind.AI,
				{ now: later },
			);
			expect(second.missed).toBe(false);
		});

		it("never marks a session with no stored row", () => {
			const sessions = buildSessions(
				startedAt,
				[],
				CheckpointCuratorKind.Human,
				{ now: later },
			);
			expect(sessions.some((session) => session.missed)).toBe(false);
		});
	});

	describe("who came", () => {
		const ended = {
			index: 2,
			scheduledAt: new Date("2026-10-08T14:00:00Z"),
			rescheduledAt: null,
			curatorJoinedAt: new Date("2026-10-08T13:58:00Z"),
			endedAt: new Date("2026-10-08T15:00:00Z"),
			contentStatus: null,
		};
		const second = (attendeeIds: string[], endedAt: Date | null = ended.endedAt) =>
			buildSessions(
				startedAt,
				[{ ...ended, endedAt, attendeeIds }],
				CheckpointCuratorKind.Human,
				{ now: new Date("2026-10-09T00:00:00Z"), curatorId: "curator" },
			)[1];

		it("knows the team came once someone besides the curator was in", () => {
			expect(second(["curator", "marta"]).teamJoined).toBe(true);
			expect(second(["curator"]).teamJoined).toBe(false);
		});

		it("does not say before the call has ended", () => {
			expect(second([], null).teamJoined).toBeNull();
		});
	});
});

describe("currentSessionOf", () => {
	const sessions = [
		{ index: 1, scheduledAt: new Date("2026-10-01T12:00:00Z") },
		{ index: 2, scheduledAt: new Date("2026-10-08T15:00:00Z") },
		{ index: 3, scheduledAt: new Date("2026-10-15T00:00:00Z") },
	];

	it("is the first before any session's day", () => {
		expect(currentSessionOf(sessions, new Date("2026-09-30T23:00:00Z"))).toBe(
			1,
		);
	});

	it("counts a call later today as under way", () => {
		expect(currentSessionOf(sessions, new Date("2026-10-08T09:00:00Z"))).toBe(
			2,
		);
	});

	it("stays on the last one reached until the next one's day", () => {
		expect(currentSessionOf(sessions, new Date("2026-10-14T23:59:00Z"))).toBe(
			2,
		);
		expect(currentSessionOf(sessions, new Date("2026-10-15T00:00:00Z"))).toBe(
			3,
		);
	});
});
