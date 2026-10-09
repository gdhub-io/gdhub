import { describe, expect, it } from "vitest";
import { CHECKPOINT_SCOPE_DAY, scopeState } from "@/lib/checkpoint-scope";

const startedAt = "2026-09-01T00:00:00.000Z";
const at = (iso: string) => new Date(iso);

describe("scopeState", () => {
	it("falls on the third session's day", () => {
		expect(CHECKPOINT_SCOPE_DAY).toBe(15);
	});

	it("without a stored session, gives the whole of day 15", () => {
		expect(scopeState(startedAt, [], at("2026-09-14T23:59:00.000Z"))).toBe("early");
		expect(scopeState(startedAt, [], at("2026-09-15T00:00:00.000Z"))).toBe("open");
		expect(scopeState(startedAt, [], at("2026-09-15T23:59:00.000Z"))).toBe("open");
		expect(scopeState(startedAt, [], at("2026-09-16T00:00:00.000Z"))).toBe("closed");
	});

	// A call late in the day must not leave the author a few hours.
	it("runs for a day after the third session ended", () => {
		const sessions = [
			{
				index: 3,
				scheduledAt: "2026-09-15T18:00:00.000Z",
				endedAt: "2026-09-15T18:45:00.000Z",
			},
		];

		expect(scopeState(startedAt, sessions, at("2026-09-15T17:59:00.000Z"))).toBe("early");
		expect(scopeState(startedAt, sessions, at("2026-09-16T18:44:00.000Z"))).toBe("open");
		expect(scopeState(startedAt, sessions, at("2026-09-16T18:45:00.000Z"))).toBe("closed");
	});

	it("counts a session that never ended from its start", () => {
		const sessions = [
			{ index: 3, scheduledAt: "2026-09-16T10:00:00.000Z", endedAt: null },
		];

		expect(scopeState(startedAt, sessions, at("2026-09-17T09:59:00.000Z"))).toBe("open");
		expect(scopeState(startedAt, sessions, at("2026-09-17T10:00:00.000Z"))).toBe("closed");
	});
});
