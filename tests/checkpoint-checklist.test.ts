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
	devlogDay: 13,
	state: "current",
};

const sprint1: CheckpointSprintDto = {
	...sprint2,
	number: 1,
	from: "2026-10-01T00:00:00.000Z",
	to: "2026-10-07T00:00:00.000Z",
	firstDay: 1,
	lastDay: 7,
	devlogDay: 6,
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
						curatorFeedback: null,
						curatorFeedbackAt: null,
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

	it("dates the devlog on the sprint's sixth day", () => {
		const devlog = sprintChecklist(checkpoint(), sprint2, false).find(
			(item) => item.key === "devlog",
		);

		expect(devlog?.dueAt).toBe("2026-10-13T00:00:00.000Z");
	});
});
