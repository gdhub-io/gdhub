import { describe, expect, it } from "vitest";
import { curatorNow } from "@/lib/checkpoints/curator-now";

// Started 1 Oct: sessions at UTC midnight of days 1, 8, 15, 22 and 29.
const startedAt = "2026-10-01T00:00:00.000Z";
const days = ["01", "08", "15", "22", "29"];
const session = (index: number, content: unknown = null) => ({
	index,
	scheduledAt: `2026-10-${days[index - 1]}T00:00:00.000Z`,
	endedAt: null as string | null,
	contentStatus: content ? "Ready" : null,
	content,
});
const empty = [1, 2, 3, 4, 5].map((index) => session(index));
const withSession = (index: number, content: unknown, endedAt?: string) =>
	empty.map((row) =>
		row.index === index
			? { ...session(index, content), endedAt: endedAt ?? null }
			: row,
	);
const checkpoint = (overrides: Record<string, unknown> = {}) => ({
	startedAt,
	goalAgreedAt: null,
	planCheckedAt: null,
	scopeConfirmedAt: null,
	sessions: empty,
	...overrides,
});
const at = (iso: string) => new Date(iso);

describe("what the AI curator says now", () => {
	it("is writing the first letter, and asks again in half a minute", () => {
		const now = curatorNow(checkpoint(), at("2026-10-01T10:00:00Z"));
		expect(now.state).toBe("reading");
		expect(now.nextAt).toBe("2026-10-01T10:00:30.000Z");
	});

	it("asks for the tasks in the first letter", () => {
		const now = curatorNow(
			checkpoint({ sessions: withSession(1, { message: "Hello." }) }),
			at("2026-10-01T10:00:00Z"),
		);
		expect(now).toMatchObject({ state: "tasksWanted", text: "Hello." });
	});

	it("waits for the approval until the plan approves itself", () => {
		const now = curatorNow(
			checkpoint({
				planCheckedAt: "2026-10-01T10:00:00Z",
				sessions: withSession(1, { message: "Checked." }),
			}),
			at("2026-10-01T11:00:00Z"),
		);
		expect(now).toMatchObject({
			state: "approveWanted",
			text: "Checked.",
			until: "2026-10-01T22:00:00.000Z",
			nextAt: "2026-10-01T22:00:00.000Z",
		});
	});

	it("says the plan is ready through sprint 1, until the day-8 review is written", () => {
		const approved = checkpoint({
			planCheckedAt: "2026-10-01T10:00:00Z",
			goalAgreedAt: "2026-10-01T12:00:00Z",
			sessions: withSession(1, { message: "Checked.", planLetter: "Set out." }),
		});
		expect(curatorNow(approved, at("2026-10-05T10:00:00Z"))).toMatchObject({
			state: "planReady",
			text: "Set out.",
			nextAt: "2026-10-08T01:15:00.000Z",
		});
		// Day 8 before the run: the sprint is being read.
		expect(curatorNow(approved, at("2026-10-08T00:30:00Z"))).toMatchObject({
			state: "sprintReading",
			index: 2,
			nextAt: "2026-10-08T01:15:00.000Z",
		});
	});

	it("stops asking once the review is late — the next visit reads it", () => {
		const now = curatorNow(checkpoint(), at("2026-10-08T05:00:00Z"));
		expect(now).toMatchObject({ state: "sprintReading", nextAt: null });
	});

	it("reads the review until the next one", () => {
		const now = curatorNow(
			checkpoint({ sessions: withSession(2, { message: "Sprint 1." }) }),
			at("2026-10-10T10:00:00Z"),
		);
		expect(now).toMatchObject({
			state: "review",
			index: 2,
			text: "Sprint 1.",
			nextAt: "2026-10-15T01:15:00.000Z",
		});
	});

	it("keeps the day-15 change open until it closes or is confirmed", () => {
		const sessions = withSession(
			3,
			{ message: "Sprint 2." },
			"2026-10-15T01:00:00Z",
		);
		expect(
			curatorNow(checkpoint({ sessions }), at("2026-10-15T12:00:00Z")),
		).toMatchObject({
			state: "scopeOpen",
			until: "2026-10-16T01:00:00.000Z",
			nextAt: "2026-10-16T01:00:00.000Z",
		});
		expect(
			curatorNow(
				checkpoint({ sessions, scopeConfirmedAt: "2026-10-15T13:00:00Z" }),
				at("2026-10-15T14:00:00Z"),
			).state,
		).toBe("review");
		expect(
			curatorNow(checkpoint({ sessions }), at("2026-10-16T02:00:00Z")).state,
		).toBe("review");
	});

	it("waits for the verdict on day 29, then reads it", () => {
		expect(curatorNow(checkpoint(), at("2026-10-29T00:20:00Z")).state).toBe(
			"verdictReading",
		);
		const now = curatorNow(
			checkpoint({ sessions: withSession(5, { message: "The verdict." }) }),
			at("2026-10-29T09:00:00Z"),
		);
		expect(now).toMatchObject({
			state: "verdict",
			text: "The verdict.",
			nextAt: null,
		});
	});
});
