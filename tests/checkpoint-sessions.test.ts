import { describe, expect, it } from "vitest";
import { buildSessions, sessionDay } from "@/lib/checkpoint-sessions";

const startedAt = new Date("2026-10-01T15:30:00Z");

describe("checkpoint sessions", () => {
	it("falls on days 1, 8, 15, 22 and 29", () => {
		expect([1, 2, 3, 4, 5].map(sessionDay)).toEqual([1, 8, 15, 22, 29]);
	});

	it("has none before the checkpoint starts", () => {
		expect(buildSessions(null, [])).toEqual([]);
	});

	it("reads the calendar at UTC midnight when nothing is stored", () => {
		const sessions = buildSessions(startedAt, []);

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
		]);

		expect(sessions[1]).toMatchObject({
			index: 2,
			day: 8,
			scheduledAt: moved.toISOString(),
			timeKnown: true,
			rescheduledAt: "2026-10-05T09:00:00.000Z",
		});
		expect(sessions[0].timeKnown).toBe(false);
	});
});
