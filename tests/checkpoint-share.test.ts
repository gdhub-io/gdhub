import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckpointVerdict } from "@/config/prisma-enums";
import { roadLine, sharePost } from "@/lib/checkpoints/share-card";

/**
 * GDHUB-144: the verdict share card. What can go wrong silently is a missed
 * goal called "passed", a line praising a verdict the rule overturned, a line
 * written again on every open, and the card reaching someone off the team.
 */

describe("the card's words", () => {
	it.each([
		[1, CheckpointVerdict.StageClosed, "The first checkpoint passed on the road to the release"],
		[4, CheckpointVerdict.GoalMet, "Checkpoint 4 passed on the road to the release"],
		[3, CheckpointVerdict.GoalMissed, "Checkpoint 3 done on the road to the release"],
		[1, CheckpointVerdict.GoalMissed, "The first checkpoint done on the road to the release"],
	] as const)("checkpoint %i, %s → %s", (number, verdict, line) => {
		expect(roadLine(number, verdict)).toBe(line);
	});

	it("ends the post with the project's page", () => {
		const post = (link: string) =>
			sharePost({
				number: 4,
				verdict: CheckpointVerdict.StageClosed,
				project: "E2E Test Game",
				curator: "Elder Aldric",
				line: "By my staff!",
				link,
			});
		expect(post("https://gdhub.io/project/e2e")).toBe(
			"Checkpoint 4 passed on the road to the release of my game, E2E Test Game: ready for the next stage. Elder Aldric, my AI curator: “By my staff!”\nhttps://gdhub.io/project/e2e",
		);
	});

	it("names the curator only when it plays a character", () => {
		expect(
			sharePost({
				number: 2,
				verdict: CheckpointVerdict.GoalMet,
				project: "E2E Test Game",
				curator: null,
				line: "Sparkling roofs!",
				link: "https://gdhub.io/project/e2e",
			}),
		).toContain("goal met. My AI curator: “Sparkling roofs!”");
	});
});

const findUnique = vi.fn();
const updateMany = vi.fn();
const findUniqueOrThrow = vi.fn();
const writeShareLine = vi.fn();

vi.mock("@/services/prisma", () => ({
	prisma: {
		projectCheckpoint: { findUnique, updateMany, findUniqueOrThrow },
	},
}));
vi.mock("@/repositories/checkpoints/number", () => ({
	checkpointNumber: async () => 4,
}));
vi.mock("@/services/checkpoints/ai-curator/share-line", () => ({
	writeShareLine: (...args: unknown[]) => writeShareLine(...args),
}));

const { shareCardOf } = await import("@/services/checkpoints/flows/share");

const row = (over: Record<string, unknown> = {}) => ({
	curatorId: null,
	projectId: "p1",
	createdAt: new Date("2026-12-07"),
	status: "Closed",
	curatorKind: "AI",
	curatorCharacter: null,
	stageName: "Prototyping",
	goal: "Five strangers finish level 1",
	verdict: CheckpointVerdict.GoalMissed,
	verdictNote: "Two friends played, not five strangers.",
	shareLine: null,
	decidedAt: new Date("2027-01-04"),
	startedAt: new Date("2026-12-07"),
	project: {
		authorId: "author",
		team: { members: [] },
		name: "E2E Test Game",
		slug: "e2e-test-game",
		description: "A gnome saves Christmas.",
		coverImage: null,
	},
	reports: [],
	...over,
});

beforeEach(() => {
	vi.clearAllMocks();
	writeShareLine.mockResolvedValue("The gnome leaps! May five strangers follow.");
	updateMany.mockResolvedValue({ count: 1 });
	// The line's context, read only when the line is written.
	findUniqueOrThrow.mockResolvedValue({
		goal: "Five strangers finish level 1",
		verdictNote: "Two friends played, not five strangers.",
		project: { description: "A gnome saves Christmas." },
		reports: [],
	});
});

describe("the curator's line", () => {
	it("is written from the settled verdict on the checkpoint, and kept", async () => {
		findUnique.mockResolvedValue(row());

		const card = await shareCardOf("cp1", "author");

		expect(writeShareLine).toHaveBeenCalledWith(
			expect.objectContaining({ verdict: CheckpointVerdict.GoalMissed }),
			{ checkpointId: "cp1", purpose: "shareLine" },
		);
		// Only into an empty field: a second request racing this one keeps the first line.
		expect(updateMany).toHaveBeenCalledWith({
			where: { id: "cp1", shareLine: null },
			data: { shareLine: "The gnome leaps! May five strangers follow." },
		});
		expect(card?.line).toBe("The gnome leaps! May five strangers follow.");
	});

	it("is read back, never written again, once kept", async () => {
		findUnique.mockResolvedValue(row({ shareLine: "Kept line." }));

		const card = await shareCardOf("cp1", "author");

		expect(writeShareLine).not.toHaveBeenCalled();
		expect(updateMany).not.toHaveBeenCalled();
		// The devlogs and the note are read only to write the line.
		expect(findUniqueOrThrow).not.toHaveBeenCalled();
		expect(card?.line).toBe("Kept line.");
	});
});

describe("who gets the card", () => {
	it.each([
		["a stranger", row(), "stranger"],
		["the project's author, a human curator's checkpoint", row({ curatorKind: "Human" }), "author"],
		["the author, a checkpoint still running", row({ status: "Active" }), "author"],
		["the author, no verdict yet", row({ verdict: null }), "author"],
	] as const)("not %s", async (_, checkpoint, userId) => {
		findUnique.mockResolvedValue(checkpoint);

		expect(await shareCardOf("cp1", userId)).toBeNull();
		expect(writeShareLine).not.toHaveBeenCalled();
	});

	it("a confirmed team member", async () => {
		findUnique.mockResolvedValue(
			row({ project: { ...row().project, team: { members: [{ id: "tm1" }] } } }),
		);

		expect(await shareCardOf("cp1", "member")).not.toBeNull();
	});
});
