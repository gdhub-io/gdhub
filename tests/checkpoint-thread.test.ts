import { describe, expect, it } from "vitest";
import { buildThread } from "@/components/checkpoints/CheckpointThread/entries";
import {
	CheckpointCuratorKind,
	CheckpointStatus,
	CheckpointVerdict,
} from "@/config/prisma-enums";
import type { CheckpointDto } from "@/types/checkpoints";

const base: CheckpointDto = {
	id: "cp1",
	projectId: "p1",
	stepId: "s1",
	stageName: "Prototyping",
	order: 2,
	status: CheckpointStatus.Active,
	goal: "A playable vertical slice",
	curatorKind: CheckpointCuratorKind.AI,
	curator: null,
	startedAt: "2026-09-01T09:00:00.000Z",
	dueAt: "2026-09-28T09:00:00.000Z",
	goalAgreedAt: null,
	revisedAt: null,
	revisedNote: null,
	midNote: null,
	summary: null,
	verdict: null,
	verdictNote: null,
	decidedAt: null,
	acceptedTermsAt: null,
	createdAt: "2026-09-01T08:00:00.000Z",
	updatedAt: "2026-09-01T08:00:00.000Z",
	items: [],
	reports: [],
	day: 14,
	daysLeft: 14,
};

describe("buildThread", () => {
	it("is newest first", () => {
		const thread = buildThread({
			...base,
			goalAgreedAt: "2026-09-01T15:00:00.000Z",
			reports: [
				{
					id: "r1",
					publishedAt: "2026-09-07T10:00:00.000Z",
					content: "Tide states are in",
					curatorFeedback: null,
					curatorFeedbackAt: null,
				},
			],
		});

		expect(thread.map((entry) => entry.kind)).toEqual([
			"devlog",
			"goalAgreed",
			"started",
		]);
	});

	it("dates the verdict on day 29 rather than clamping it to 28", () => {
		const [verdict] = buildThread({
			...base,
			verdict: CheckpointVerdict.StageClosed,
			verdictNote: "Everything owed is proven.",
			decidedAt: "2026-09-29T08:00:00.000Z",
		});

		expect(verdict).toMatchObject({ kind: "verdict", day: 29 });
	});

	it("counts the day from midnight, not from the hour it started", () => {
		const [devlog] = buildThread({
			...base,
			startedAt: "2026-09-01T23:50:00.000Z",
			reports: [
				{
					id: "r1",
					publishedAt: "2026-09-02T00:10:00.000Z",
					content: "Twenty minutes later",
					curatorFeedback: null,
					curatorFeedbackAt: null,
				},
			],
		});

		expect(devlog.day).toBe(2);
	});

	it("puts the scope note on day 14 whatever the calendar says", () => {
		const thread = buildThread({ ...base, midNote: "Two outcomes are bare." });

		expect(thread.find((entry) => entry.kind === "scopeNote")).toMatchObject({
			day: 14,
			body: "Two outcomes are bare.",
		});
	});

	it("carries the curator's answer with the post it answers", () => {
		const [devlog] = buildThread({
			...base,
			reports: [
				{
					id: "r1",
					publishedAt: "2026-09-07T10:00:00.000Z",
					content: "# Tide states\nAll three are in.",
					curatorFeedback: "This moves the tide outcome.",
					curatorFeedbackAt: "2026-09-08T06:00:00.000Z",
				},
			],
		});

		expect(devlog.title).toBe("Tide states");
		expect(devlog.answer).toMatchObject({
			text: "This moves the tide outcome.",
		});
	});

	it("has nothing to show before the checkpoint starts", () => {
		expect(buildThread({ ...base, startedAt: null })).toEqual([]);
	});
});
