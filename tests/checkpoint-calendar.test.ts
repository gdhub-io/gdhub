import { describe, expect, it, vi } from "vitest";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import { checkpointCalendar } from "@/lib/checkpoints/calendar";

vi.stubEnv("NEXTAUTH_SECRET", "test-secret");
const { calendarToken, calendarTokenOf } = await import(
	"@/lib/checkpoints/calendar-token"
);

const startedAt = new Date("2026-10-01T00:00:00Z");
const call = (index: number, at: string, endedAt: string | null = null) => ({
	index,
	scheduledAt: new Date(at),
	endedAt: endedAt ? new Date(endedAt) : null,
});
const human = {
	id: "cp",
	startedAt,
	curatorKind: CheckpointCuratorKind.Human,
	sessions: [
		call(1, "2026-10-01T14:00:00Z", "2026-10-01T14:45:00Z"),
		// Call 2, moved a day later.
		call(2, "2026-10-09T11:00:00Z"),
		call(3, "2026-10-15T14:00:00Z"),
		call(4, "2026-10-22T14:00:00Z"),
		call(5, "2026-10-29T14:00:00Z"),
	],
};
const at = (events: ReturnType<typeof checkpointCalendar>, kind: string) =>
	events
		.filter((event) => event.kind === kind)
		.map((event) => event.start.toISOString());

describe("checkpointCalendar", () => {
	it("gives the team its calls as booked, the sprint deadlines, the change window and the verdict", () => {
		const events = checkpointCalendar(human, "team");
		expect(at(events, "call")).toEqual([
			"2026-10-01T14:00:00.000Z",
			"2026-10-09T11:00:00.000Z",
			"2026-10-15T14:00:00.000Z",
			"2026-10-22T14:00:00.000Z",
			"2026-10-29T14:00:00.000Z",
		]);
		expect(at(events, "deadline")).toEqual([
			"2026-10-07T00:00:00.000Z",
			"2026-10-14T00:00:00.000Z",
			"2026-10-21T00:00:00.000Z",
			"2026-10-28T00:00:00.000Z",
		]);
		expect(at(events, "verdict")).toEqual(["2026-10-31T00:00:00.000Z"]);
		expect(at(events, "evidence")).toEqual(["2026-10-26T00:00:00.000Z"]);
		expect(at(events, "brief")).toEqual([]);
		// From the start of call 3 until a day after it.
		const change = events.find((event) => event.kind === "change");
		expect(change?.start.toISOString()).toBe("2026-10-15T14:00:00.000Z");
		expect(change?.minutes).toBe(24 * 60);
	});

	it("gives the curator the AI's briefs the night before calls 2–5", () => {
		expect(at(checkpointCalendar(human, "curator"), "brief")).toEqual([
			"2026-10-08T01:00:00.000Z",
			"2026-10-15T01:00:00.000Z",
			"2026-10-22T01:00:00.000Z",
			"2026-10-29T01:00:00.000Z",
		]);
	});

	it("gives the AI's plan check and reviews instead of calls, the verdict with the last one", () => {
		const events = checkpointCalendar(
			{
				...human,
				curatorKind: CheckpointCuratorKind.AI,
				sessions: [call(3, "2026-10-15T00:00:00Z", "2026-10-15T01:20:00Z")],
			},
			"team",
		);
		expect(at(events, "call")).toEqual([]);
		expect(at(events, "verdict")).toEqual([]);
		expect(at(events, "plan")).toEqual(["2026-10-01T00:00:00.000Z"]);
		expect(at(events, "review")).toEqual([
			"2026-10-08T01:00:00.000Z",
			"2026-10-15T01:00:00.000Z",
			"2026-10-22T01:00:00.000Z",
			"2026-10-29T01:00:00.000Z",
		]);
		// The change opens once review 2 is written.
		expect(at(events, "change")).toEqual(["2026-10-15T01:20:00.000Z"]);
	});

	it("keeps each date's id across fetches, so a subscribed calendar moves an event", () => {
		const uids = (events: ReturnType<typeof checkpointCalendar>) =>
			events.map((event) => event.uid).sort();
		expect(uids(checkpointCalendar(human, "team"))).toEqual(
			uids(
				checkpointCalendar(
					{ ...human, sessions: [call(2, "2026-10-08T14:00:00Z")] },
					"team",
				),
			),
		);
	});
});

describe("calendarToken", () => {
	it("names its person and checkpoint, and refuses a forged one", () => {
		const token = calendarToken("u1", "cp1");
		expect(calendarTokenOf(token)).toEqual({ userId: "u1", checkpointId: "cp1" });
		expect(calendarTokenOf(token.replace("cp1", "cp2"))).toBeNull();
		expect(calendarTokenOf("u1.cp1.forged")).toBeNull();
	});
});
