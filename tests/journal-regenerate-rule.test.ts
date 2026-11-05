import { describe, expect, it } from "vitest";
import { devlogsWithin } from "@/lib/checkpoints/curator-text";
import { lensWeights } from "@/lib/checkpoints/lenses";
import {
	answerOf,
	builtOnStep,
	canRebuild,
	canRegenerate,
	withRevision,
} from "@/lib/checkpoints/regenerate";
import { goalCheckHash } from "@/repositories/checkpoints/ai-curator";
import { dayOneWindow } from "@/repositories/checkpoints/day-one";
import { hintBlock } from "@/services/checkpoints/ai-curator/prompts/card";
import { goalCheckMessages } from "@/services/checkpoints/ai-curator/prompts/goal-check";
import { dayOneMediaPicks } from "@/services/checkpoints/flows/evidence-seen";
import type { GoalCheckInput } from "@/types/checkpoint-curator";

const startedAt = new Date("2026-09-01T00:00:00Z");
const day = (n: number) => new Date(startedAt.getTime() + (n - 1) * 86_400_000 + 43_200_000);
const open = { status: "Active" as const, verdict: null, startedAt };

const entry = (kind: string, sprint: number | null, input: unknown = {}, output: unknown = {}) => ({
	kind,
	sprint,
	input,
	output,
});
const first = entry("Letter", null, { letter: "first" });
const plan = entry("Letter", null, { letter: "plan" });
const startAdvice = entry("Letter", null, { moment: "start" });
const look0 = entry("Artifact", 0);
const look1 = entry("Evidence", 1);
const review1 = entry("Review", 1, {}, { message: "On course." });
const look2 = entry("DevlogMedia", 2);
const report = entry("Review", 4, {}, { summary: "The run." });
const settled = entry("Verdict", 4, null, { by: "ai", settled: "GoalMet" });
const read = entry("Verdict", 4, {}, { by: "ai", settled: null });
const pulse = entry("Platform", 1, { to: "u1" });

describe("which journal rows are AI answers", () => {
	it("tells the answers apart and refuses the rule-based rows and the closing report", () => {
		expect(
			[first, plan, startAdvice, look0, review1, entry("Review", 2, {}, { audience: "curator" }), read].map(answerOf),
		).toEqual(["firstLetter", "planLetter", "advice", "look", "review", "brief", "verdictRead"]);
		expect([report, settled, pulse, entry("Snapshot", 0)].map(answerOf)).toEqual([null, null, null, null]);
	});
});

describe("the open-step rule", () => {
	const journal = [first, startAdvice, plan, look0, look1, review1, look2];

	it("dates the latest written answer: the sprint 1 review fixes day one", () => {
		expect(builtOnStep([first, plan, look0])).toBe(0);
		expect(builtOnStep(journal)).toBe(1);
	});

	it("keeps day one open until a later answer builds on it", () => {
		expect(canRegenerate(open, [first, plan, look0], first)).toBe(true);
		expect(canRegenerate(open, [first, plan, look0], look0)).toBe(true);
	});

	it("closes a step a later answer built on, and leaves its own step and the next open", () => {
		expect(canRegenerate(open, journal, first)).toBe(false);
		expect(canRegenerate(open, journal, plan)).toBe(false);
		expect(canRegenerate(open, journal, look0)).toBe(false);
		expect(canRegenerate(open, journal, look1)).toBe(true);
		expect(canRegenerate(open, journal, review1)).toBe(true);
		expect(canRegenerate(open, journal, look2)).toBe(true);
	});

	it("refuses everything on a closed checkpoint, and never the report or a rule-based row", () => {
		expect(canRegenerate({ ...open, verdict: "GoalMet" }, journal, look2)).toBe(false);
		expect(canRegenerate({ ...open, status: "Closed" }, journal, look2)).toBe(false);
		expect(canRegenerate({ ...open, status: "Cancelled" }, journal, look2)).toBe(false);
		// Days over, the verdict not yet written: still open.
		expect(canRegenerate({ ...open, status: "Review" }, journal, look2)).toBe(true);
		expect(canRegenerate(open, [...journal, report], report)).toBe(false);
		expect(canRegenerate(open, [...journal, pulse], pulse)).toBe(false);
	});

	it("rebuilds only an open step that has begun", () => {
		const now = day(10); // sprint 2
		expect([0, 1, 2, 3, 4].map((step) => canRebuild(open, journal, step, now))).toEqual([
			false,
			true,
			true,
			false,
			false,
		]);
		expect(canRebuild({ ...open, startedAt: null }, [], 0, now)).toBe(false);
		expect(canRebuild(open, journal, 5, day(28))).toBe(false);
	});
});

describe("the entry's history", () => {
	const revision = (n: number) => ({
		at: `2026-09-0${n}T00:00:00.000Z`,
		by: "admin",
		mode: "regenerate" as const,
		hint: null,
		previousOutput: { n },
	});

	it("appends to the history and keeps every field of the input", () => {
		const once = withRevision({ letter: "plan", goal: "G" }, revision(1));
		const twice = withRevision(once, revision(2));
		expect(twice).toEqual({ letter: "plan", goal: "G", revisions: [revision(1), revision(2)] });
	});

	it("keeps the history when a look's new read replaces its input", () => {
		const once = withRevision({ text: "old", unread: "empty page" }, revision(1));
		expect(withRevision(once, revision(2), { text: "the concept", unread: null })).toEqual({
			text: "the concept",
			unread: null,
			revisions: [revision(1), revision(2)],
		});
	});
});

describe("the admin hint is one extra input", () => {
	const input = {
		card: { goal: "A slice", outcomes: [], inputs: [] },
		workflow: {
			projectGoal: null,
			currentStage: "Ideation",
			nextStage: null,
			description: null,
			goal: null,
			lenses: lensWeights("Ideation"),
			requiredTasks: [],
		},
		project: { name: "Tide", pitch: null, genre: null },
		author: null,
		team: { members: 1, stated: 0, hoursPerWeek: null, hoursPerRun: null, people: [], openings: [] },
		previous: null,
		picture: "",
		marketing: { devlogs: [], links: [] },
		inputsSeen: [],
	} as GoalCheckInput;

	it("leaves a scheduled prompt byte for byte as it was", () => {
		expect(hintBlock(undefined)).toBe("");
		expect(hintBlock("  ")).toBe("");
		expect(goalCheckMessages({ ...input, hint: null })).toEqual(goalCheckMessages(input));
	});

	it("appends the note, labelled, after the prompt", () => {
		const [, user] = goalCheckMessages({ ...input, hint: "Read the whole Notion page" });
		expect(user.content.endsWith("Admin note for this answer, from the GDHub team (not the participant): Read the whole Notion page")).toBe(true);
		expect(user.content.startsWith(goalCheckMessages(input)[1].content)).toBe(true);
	});

	it("never moves the goal check's hash, and a card without earlier devlogs hashes as before", () => {
		expect(goalCheckHash({ ...input, hint: "x" })).toBe(goalCheckHash(input));
		expect(goalCheckHash({ ...input, devlogs: [{ publishedAt: "2026-08-01", content: "x" }] })).not.toBe(
			goalCheckHash(input),
		);
	});

	it("says how many earlier devlogs did not fit, and nothing when all did", () => {
		const devlogs = [{ publishedAt: "2026-08-01", content: "Greybox" }];
		const [, all] = goalCheckMessages({ ...input, devlogs });
		expect(all.content).not.toContain("not included");
		const [, some] = goalCheckMessages({ ...input, devlogs, devlogsLeftOut: 3 });
		expect(some.content).toContain("3 earlier devlogs not included (too long).");
	});
});

describe("day one's devlogs", () => {
	const end = new Date("2026-09-01T00:00:00Z");

	it("reads everything before the first checkpoint, and only since the previous start otherwise", () => {
		expect(dayOneWindow(end, null)).toEqual({ lt: end });
		const previous = new Date("2026-07-01T00:00:00Z");
		expect(dayOneWindow(end, previous)).toEqual({ lt: end, gte: previous });
	});

	it("keeps the newest devlogs that fit, oldest first, and counts the earlier ones left out", () => {
		const size = (text: string) => text.length;
		expect(devlogsWithin(["aaaa", "bb", "cc"], size, 5)).toEqual({ kept: ["bb", "cc"], leftOut: 1 });
		// A gap is never skipped over: the earliest ones go, never one in the middle.
		expect(devlogsWithin(["a", "bbbbbb", "cc"], size, 5)).toEqual({ kept: ["cc"], leftOut: 2 });
		expect(devlogsWithin(["a", "b"], size, 5)).toEqual({ kept: ["a", "b"], leftOut: 0 });
	});

	it("looks at the media of the newest devlogs first, each link once, inside the budget", () => {
		const devlog = (id: string, links: string[]) => ({
			id,
			content: links.join(" "),
			video: null,
			contentEditor: null,
		});
		const picks = dayOneMediaPicks(
			[
				devlog("old", ["https://a/1.png", "https://a/2.png"]),
				devlog("new", ["https://b/1.png", "https://b/2.png"]),
			],
			new Set(["new https://b/2.png"]),
			2,
		);
		expect(picks.map((pick) => `${pick.devlog.id} ${pick.link}`)).toEqual([
			"new https://b/1.png",
			"old https://a/1.png",
		]);
	});
});
