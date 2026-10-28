import { describe, expect, it } from "vitest";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import { sprintChecklist } from "@/lib/checkpoint-checklist";
import type {
	CheckpointDto,
	CheckpointEvidenceDto,
	CheckpointSprintDto,
} from "@/types/checkpoints";

const sprint2: CheckpointSprintDto = {
	number: 2,
	from: "2026-10-08T00:00:00.000Z",
	to: "2026-10-14T00:00:00.000Z",
	firstDay: 8,
	lastDay: 14,
	devlogDay: 14,
	state: "current",
};

const sprint1: CheckpointSprintDto = {
	...sprint2,
	number: 1,
	from: "2026-10-01T00:00:00.000Z",
	to: "2026-10-07T00:00:00.000Z",
	firstDay: 1,
	lastDay: 7,
	devlogDay: 7,
};

const evidence = (
	sprint: number,
	type: CheckpointEvidenceDto["artifact"]["type"],
	itemIds: string[] = [],
): CheckpointEvidenceDto => ({
	artifact: { id: `a-${type}`, name: null, type, link: "https://x.test", checkStatus: null },
	addedAt: "2026-10-09T10:00:00.000Z",
	addedBy: null,
	itemIds,
	sprint,
});

const checkpoint = (overrides: Partial<CheckpointDto> = {}) =>
	({
		curatorKind: CheckpointCuratorKind.Human,
		startedAt: "2026-10-01T00:00:00.000Z",
		previousVerdictReadAt: null,
		sessions: [],
		reports: [],
		evidence: [],
		...overrides,
	}) as CheckpointDto;

const keys = (items: { key: string }[]) => items.map((item) => item.key);

describe("sprint checklist", () => {
	it("asks for the previous verdict only in sprint 1, and only when there was one", () => {
		expect(keys(sprintChecklist(checkpoint(), sprint1, true))).toContain("verdict");
		expect(keys(sprintChecklist(checkpoint(), sprint1, false))).not.toContain(
			"verdict",
		);
		expect(keys(sprintChecklist(checkpoint(), sprint2, true))).not.toContain(
			"verdict",
		);
	});

	it("has no call to attend under the AI curator", () => {
		const items = sprintChecklist(
			checkpoint({ curatorKind: CheckpointCuratorKind.AI }),
			sprint2,
			false,
		);

		expect(keys(items)).toEqual(["build", "devlog", "artifacts"]);
	});

	it("ticks the call only once the session opening the sprint has ended", () => {
		const session = {
			index: 2,
			day: 8,
			scheduledAt: "2026-10-08T14:00:00.000Z",
			timeKnown: true,
			rescheduledAt: null,
			curatorJoinedAt: "2026-10-08T14:01:00.000Z",
			endedAt: null,
			contentStatus: null,
			missed: false,
		};
		const open = sprintChecklist(checkpoint({ sessions: [session] }), sprint2, false);
		const ended = sprintChecklist(
			checkpoint({
				sessions: [{ ...session, endedAt: "2026-10-08T14:50:00.000Z" }],
			}),
			sprint2,
			false,
		);

		expect(open.find((item) => item.key === "priorities")?.done).toBe(false);
		expect(ended.find((item) => item.key === "priorities")?.done).toBe(true);
	});

	it("reads the build, the devlog and the evidence from this sprint only", () => {
		const items = sprintChecklist(
			checkpoint({
				builds: [{ id: "b1", addedAt: "2026-10-03T09:00:00.000Z", sprint: 1 }],
				evidence: [
					evidence(1, "ExecutableBuild", ["o1"]),
					evidence(2, "Concept", ["o2"]),
				],
				reports: [
					{
						id: "r1",
						publishedAt: "2026-10-03T09:00:00.000Z",
						content: "",
						sprint: 1,
					},
				],
			}),
			sprint2,
			false,
		);
		const done = Object.fromEntries(items.map((item) => [item.key, item.done]));

		expect(done).toEqual({
			priorities: false,
			build: false,
			devlog: false,
			artifacts: true,
		});
	});

	it("dates the devlog on the sprint's last day", () => {
		const devlog = sprintChecklist(checkpoint(), sprint2, false).find(
			(item) => item.key === "devlog",
		);

		expect(devlog?.dueAt).toBe("2026-10-14T00:00:00.000Z");
	});

	it("gives every line a date: the verdict and the priorities the call, the rest the sprint's last day", () => {
		const items = sprintChecklist(
			checkpoint({
				sessions: [
					{
						index: 1,
						scheduledAt: "2026-10-01T14:00:00.000Z",
					} as NonNullable<CheckpointDto["sessions"]>[number],
				],
			}),
			sprint1,
			true,
		);
		const due = Object.fromEntries(items.map((item) => [item.key, item.dueAt]));

		expect(due).toEqual({
			verdict: "2026-10-01T14:00:00.000Z",
			plan: "2026-10-01T14:00:00.000Z",
			priorities: "2026-10-01T14:00:00.000Z",
			build: "2026-10-07T00:00:00.000Z",
			devlog: "2026-10-07T00:00:00.000Z",
			artifacts: "2026-10-07T00:00:00.000Z",
		});
	});

	describe("the plan", () => {
		const ai = (overrides: Partial<CheckpointDto> = {}) =>
			checkpoint({
				curatorKind: CheckpointCuratorKind.AI,
				goalAgreedAt: null,
				items: [],
				...overrides,
			});
		const task = { kind: "Outcome", cut: false } as CheckpointDto["items"][number];
		const planOf = (data: CheckpointDto, sprint = sprint1, now?: Date) =>
			sprintChecklist(data, sprint, false, now).find((item) => item.key === "plan");

		it("walks day 1 with the AI curator: write, send, approve, ready", () => {
			expect(planOf(ai())?.step).toBe("write");
			expect(planOf(ai({ items: [task] }))?.step).toBe("send");
			expect(
				planOf(ai({ items: [task], planCheckedAt: "2026-10-01T10:00:00.000Z" })),
			).toMatchObject({ step: "approve", dueAt: "2026-10-01T22:00:00.000Z" });
			expect(
				planOf(ai({ goalAgreedAt: "2026-10-01T12:00:00.000Z" }))?.done,
			).toBe(true);
		});

		it("is drafted for call 1 with a person", () => {
			expect(planOf(checkpoint({ goalAgreedAt: null, items: [] }))).toMatchObject({
				step: "write",
				done: false,
			});
		});

		it("waits on day 15 for the review, opens, then is fixed", () => {
			const sprint3 = { ...sprint2, number: 3, firstDay: 15, lastDay: 21, devlogDay: 21 };
			const written = ai({
				sessions: [
					{
						index: 3,
						scheduledAt: "2026-10-15T00:00:00.000Z",
						endedAt: "2026-10-15T01:00:00.000Z",
					} as NonNullable<CheckpointDto["sessions"]>[number],
				],
			});
			expect(planOf(ai(), sprint3, new Date("2026-10-15T00:30:00Z"))?.step).toBe(
				"waiting",
			);
			expect(planOf(written, sprint3, new Date("2026-10-15T12:00:00Z"))).toMatchObject({
				step: "open",
				dueAt: "2026-10-16T01:00:00.000Z",
			});
			expect(planOf(written, sprint3, new Date("2026-10-16T02:00:00Z"))?.done).toBe(true);
			expect(
				planOf(
					{ ...written, scopeConfirmedAt: "2026-10-15T13:00:00.000Z" },
					sprint3,
					new Date("2026-10-15T14:00:00Z"),
				)?.done,
			).toBe(true);
		});

		it("is not a line in sprints 2 and 4", () => {
			expect(planOf(ai(), sprint2)).toBeUndefined();
		});
	});
});
