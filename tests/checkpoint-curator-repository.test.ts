import { readFileSync } from "node:fs";
import {
	CheckpointItemKind,
	CheckpointStatus,
	CheckpointVerdict,
	TeamMemberStatus,
} from "@gdhub-io/gdhub-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SPRINTS_PER_CHECKPOINT } from "@/config/checkpoint";
import { recheckCheckpointArtifacts } from "@/repositories/artifact-check";
import {
	closeCheckpoint,
	goalCheckHash,
	runGoalCheck,
	writeFirstLetter,
	writeMidNote,
	writeVerdictRead,
} from "@/repositories/checkpoint-curator.repository";
import { journal } from "@/repositories/curator-journal";
import { CONFIRMED_MEMBERS } from "@/repositories/scout.games";
import { checkpointCurator } from "@/services/checkpoint-curator";
import { notifyDayOne } from "@/services/checkpoint-notifications";
import { prisma } from "@/services/prisma";

vi.mock("@/services/prisma", () => ({
	prisma: {
		projectCheckpoint: {
			findUnique: vi.fn(),
			findFirst: vi.fn().mockResolvedValue(null),
			update: vi.fn(),
		},
		projectReport: { findUnique: vi.fn(), update: vi.fn() },
		checkpointJournalEntry: { findFirst: vi.fn() },
		projectWorkflowTask: { findMany: vi.fn().mockResolvedValue([]) },
		checkpointSession: { findFirst: vi.fn(), updateMany: vi.fn() },
	},
}));

vi.mock("@/services/checkpoint-notifications", () => ({
	notifyDayOne: vi.fn(),
}));

vi.mock("@/repositories/evidence-seen", () => ({
	seeCheckpointEvidence: vi.fn(async () => {}),
	devlogMediaLines: vi.fn(async () => []),
}));
vi.mock("@/repositories/curator-journal", () => ({ journal: vi.fn() }));
vi.mock("@/repositories/curator-context", () => ({
	projectPicture: vi.fn().mockResolvedValue("The project picture."),
	runPeriod: vi.fn(() => ({ from: new Date(0), to: new Date(0) })),
}));

vi.mock("@/repositories/artifact-check", () => ({
	recheckCheckpointArtifacts: vi.fn(),
}));

vi.mock("@/services/checkpoint-curator", () => ({
	checkpointCurator: {
		checkGoal: vi.fn(),
		writeMidNote: vi.fn(),
		writeReport: vi.fn(),
	},
}));

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(prisma.projectWorkflowTask.findMany).mockResolvedValue([] as never);
});

const outcome = (id: string, artifact: unknown = null) => ({
	id,
	kind: CheckpointItemKind.Outcome,
	text: `outcome ${id}`,
	originalText: null,
	cut: false,
	addedAt: null,
	acceptedNote: null,
	artifact,
});

const readable = {
	type: "GameplayVideo",
	name: "Slice",
	description: null,
	link: "https://example.com/v",
	checkStatus: "Readable",
};

const running = (over: Record<string, unknown> = {}) => ({
	goal: "A playable vertical slice",
	stageName: "Prototyping",
	stepId: "step-1",
	status: CheckpointStatus.Active,
	verdict: null,
	midNote: null,
	revisedAt: null,
	revisedNote: null,
	startedAt: new Date("2026-09-01T00:00:00.000Z"),
	items: [outcome("o1", readable)],
	reports: [],
	pulses: [],
	...over,
});

describe("runGoalCheck", () => {
	const member = (
		timeForWork: number[] | null,
		status: TeamMemberStatus = TeamMemberStatus.Hired,
	) => ({
		status,
		speciality: {
			name: "Level designer",
			level: "Skillful",
			specialization: null as string | null,
		},
		user: { profile: timeForWork ? { timeForWork } : null },
	});

	const draft = (
		members: ReturnType<typeof member>[],
		kept: { goalCheck?: unknown; goalCheckHash?: string | null } = {},
		project: { description?: string | null; genre?: string | null } = {},
	) => ({
		goal: "A playable vertical slice",
		stageName: "Prototyping",
		stepId: "step-1",
		goalCheck: null,
		goalCheckHash: null,
		items: [outcome("o1")],
		project: {
			name: "Lantern Keeper",
			description: "A lighthouse keeper sorts ships by night",
			genre: "Puzzle",
			team: { members },
			...project,
		},
		...kept,
	});

	const checked = { reachable: true, notes: [], missing: [], note: "n" };

	it("hands the model the team's hours, weekly and over the whole run", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			draft([member([10, 20]), member([5, 8])]) as never,
		);
		vi.mocked(checkpointCurator.checkGoal).mockResolvedValue(checked);

		await runGoalCheck("cp1");

		expect(checkpointCurator.checkGoal).toHaveBeenCalledWith(
			expect.objectContaining({
				team: {
					members: 2,
					stated: 2,
					hoursPerWeek: { from: 15, to: 28 },
					hoursPerRun: {
						from: 15 * SPRINTS_PER_CHECKPOINT,
						to: 28 * SPRINTS_PER_CHECKPOINT,
					},
				},
			}),
			{ checkpointId: "cp1" },
		);
	});

	it("tells the model what the game is and who the founder is", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			draft([
				member([10, 20]),
				{
					...member([5, 8], TeamMemberStatus.Founder),
					speciality: {
						name: "Programmer",
						level: "Beginner",
						specialization: "  Two jam games in Godot  ",
					},
				},
			]) as never,
		);
		vi.mocked(checkpointCurator.checkGoal).mockResolvedValue(checked);

		await runGoalCheck("cp1");

		expect(checkpointCurator.checkGoal).toHaveBeenCalledWith(
			expect.objectContaining({
				project: {
					name: "Lantern Keeper",
					pitch: "A lighthouse keeper sorts ships by night",
					genre: "Puzzle",
				},
				author: {
					speciality: "Programmer",
					level: "Beginner",
					experience: "Two jam games in Godot",
				},
			}),
			{ checkpointId: "cp1" },
		);
	});

	it("names no author when the team has no founder row", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			draft([member([10, 20])], {}, { description: "  ", genre: null }) as never,
		);
		vi.mocked(checkpointCurator.checkGoal).mockResolvedValue(checked);

		await runGoalCheck("cp1");

		expect(checkpointCurator.checkGoal).toHaveBeenCalledWith(
			expect.objectContaining({
				project: { name: "Lantern Keeper", pitch: null, genre: null },
				author: null,
			}),
			{ checkpointId: "cp1" },
		);
	});

	it("asks again when the pitch moved under a kept read", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			draft([member([10, 20])]) as never,
		);
		vi.mocked(checkpointCurator.checkGoal).mockResolvedValue(checked);
		await runGoalCheck("cp1");

		const [args] = vi.mocked(prisma.projectCheckpoint.update).mock.calls[0];
		const hash = (args as Record<string, any>).data.goalCheckHash;
		vi.clearAllMocks();
		vi.mocked(prisma.projectWorkflowTask.findMany).mockResolvedValue([] as never);
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			draft(
				[member([10, 20])],
				{ goalCheck: checked, goalCheckHash: hash },
				{ description: "A tide-driven roguelite" },
			) as never,
		);

		await runGoalCheck("cp1");

		expect(checkpointCurator.checkGoal).toHaveBeenCalled();
	});

	it("weighs the goal against how the last checkpoint ended", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			draft([member([10, 20])]) as never,
		);
		vi.mocked(prisma.projectCheckpoint.findFirst).mockResolvedValueOnce({
			verdict: CheckpointVerdict.GoalMissed,
			verdictNote: "Nobody outside the team played it.",
		} as never);
		vi.mocked(checkpointCurator.checkGoal).mockResolvedValue(checked);

		await runGoalCheck("cp1");

		expect(checkpointCurator.checkGoal).toHaveBeenCalledWith(
			expect.objectContaining({
				previous: {
					verdict: CheckpointVerdict.GoalMissed,
					note: "Nobody outside the team played it.",
				},
			}),
			{ checkpointId: "cp1" },
		);
		expect(prisma.projectCheckpoint.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ id: { not: "cp1" } }),
			}),
		);
	});

	it("does not read a member who stated nothing as a member with no hours", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			draft([member([10, 20]), member([]), member(null)]) as never,
		);
		vi.mocked(checkpointCurator.checkGoal).mockResolvedValue(checked);

		await runGoalCheck("cp1");

		expect(checkpointCurator.checkGoal).toHaveBeenCalledWith(
			expect.objectContaining({
				team: expect.objectContaining({
					members: 3,
					stated: 1,
					hoursPerWeek: { from: 10, to: 20 },
				}),
			}),
			{ checkpointId: "cp1" },
		);
	});

	it("leaves the hours unknown when the whole team stated nothing", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			draft([member([]), member(null)]) as never,
		);
		vi.mocked(checkpointCurator.checkGoal).mockResolvedValue(checked);

		await runGoalCheck("cp1");

		expect(checkpointCurator.checkGoal).toHaveBeenCalledWith(
			expect.objectContaining({
				team: expect.objectContaining({
					members: 2,
					hoursPerWeek: null,
					hoursPerRun: null,
				}),
			}),
			{ checkpointId: "cp1" },
		);
	});

	it("counts the team as it stands — the curator's card count, without those who left", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			draft([member([10, 20])]) as never,
		);
		vi.mocked(checkpointCurator.checkGoal).mockResolvedValue(checked);

		await runGoalCheck("cp1");

		const [args] = vi.mocked(prisma.projectCheckpoint.findUnique).mock.calls[0];
		const select = (args as Record<string, any>).select;

		expect(select.project.select.team.select.members.where).toEqual(
			CONFIRMED_MEMBERS,
		);
		expect(CONFIRMED_MEMBERS).toEqual({
			status: { in: [TeamMemberStatus.Hired, TeamMemberStatus.Founder] },
			finishedAt: null,
		});
		// The curator's card reads the same definition.
		expect(
			readFileSync("src/repositories/advisor-checkpoints.ts", "utf8"),
		).toContain("CONFIRMED_MEMBERS");
	});

	// The payment step is the only caller and opens on every load, so a read that
	// is not kept is a model call each time.
	it("keeps the read it just made, under the hash of what it asked", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			draft([member([10, 20])]) as never,
		);
		vi.mocked(checkpointCurator.checkGoal).mockResolvedValue(checked);

		await runGoalCheck("cp1");

		const [args] = vi.mocked(prisma.projectCheckpoint.update).mock.calls[0];
		const data = (args as Record<string, any>).data;

		expect(data.goalCheck).toEqual(checked);
		expect(data.goalCheckHash).toEqual(expect.any(String));
	});

	it("does not ask again while the plan behind the read is unchanged", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			draft([member([10, 20])]) as never,
		);
		vi.mocked(checkpointCurator.checkGoal).mockResolvedValue(checked);
		await runGoalCheck("cp1");

		const [args] = vi.mocked(prisma.projectCheckpoint.update).mock.calls[0];
		const hash = (args as Record<string, any>).data.goalCheckHash;
		vi.clearAllMocks();
		vi.mocked(prisma.projectWorkflowTask.findMany).mockResolvedValue([] as never);
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			draft([member([10, 20])], {
				goalCheck: checked,
				goalCheckHash: hash,
			}) as never,
		);

		await expect(runGoalCheck("cp1")).resolves.toEqual(checked);
		expect(checkpointCurator.checkGoal).not.toHaveBeenCalled();
		expect(prisma.projectCheckpoint.update).not.toHaveBeenCalled();
	});

	// The hours reach the model, so they are part of the question: a team that
	// restated them must not be answered from the card alone.
	it("asks again when the team's hours moved under a kept read", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			draft([member([10, 20])]) as never,
		);
		vi.mocked(checkpointCurator.checkGoal).mockResolvedValue(checked);
		await runGoalCheck("cp1");

		const [args] = vi.mocked(prisma.projectCheckpoint.update).mock.calls[0];
		const hash = (args as Record<string, any>).data.goalCheckHash;
		vi.clearAllMocks();
		vi.mocked(prisma.projectWorkflowTask.findMany).mockResolvedValue([] as never);
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			draft([member([30, 40])], {
				goalCheck: checked,
				goalCheckHash: hash,
			}) as never,
		);

		await runGoalCheck("cp1");

		expect(checkpointCurator.checkGoal).toHaveBeenCalled();
	});

	it("keeps nothing when the model fails", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			draft([member([10, 20])]) as never,
		);
		vi.mocked(checkpointCurator.checkGoal).mockResolvedValue(null as never);

		await expect(runGoalCheck("cp1")).resolves.toBeNull();
		expect(prisma.projectCheckpoint.update).not.toHaveBeenCalled();
	});

	it("asks nothing of the model for a checkpoint that is not there", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(null);

		await expect(runGoalCheck("cp1")).resolves.toBeNull();
		expect(checkpointCurator.checkGoal).not.toHaveBeenCalled();
	});

	describe("writeFirstLetter — day 1 after payment (GDHUB-117)", () => {
		it("writes the read as the first letter once, and tells the author", async () => {
			vi.mocked(prisma.checkpointSession.findFirst).mockResolvedValue({
				id: "s1",
				content: null,
			} as never);
			vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
				draft([member([10, 20])]) as never,
			);
			vi.mocked(checkpointCurator.checkGoal).mockResolvedValue({
				...checked,
				note: "Your plan looks good — go ahead!",
			});

			await writeFirstLetter("cp1");

			expect(prisma.checkpointSession.updateMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({ id: "s1" }),
					data: expect.objectContaining({
						content: {
							message: "Your plan looks good — go ahead!",
							notes: null,
							advice: null,
						},
					}),
				}),
			);
			expect(notifyDayOne).toHaveBeenCalledWith("cp1", true);
		});

		it("does nothing on a second webhook: the letter is there", async () => {
			vi.mocked(prisma.checkpointSession.findFirst).mockResolvedValue({
				id: "s1",
				content: { message: "written" },
			} as never);

			await writeFirstLetter("cp1");

			expect(checkpointCurator.checkGoal).not.toHaveBeenCalled();
			expect(notifyDayOne).not.toHaveBeenCalled();
		});

		it("still tells the author when the model fails, and leaves the letter to the page", async () => {
			vi.mocked(prisma.checkpointSession.findFirst).mockResolvedValue({
				id: "s1",
				content: null,
			} as never);
			vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
				draft([member([10, 20])]) as never,
			);
			vi.mocked(checkpointCurator.checkGoal).mockResolvedValue(null);

			await writeFirstLetter("cp1");

			expect(prisma.checkpointSession.updateMany).not.toHaveBeenCalled();
			expect(notifyDayOne).toHaveBeenCalledWith("cp1", false);
		});
	});
});

describe("writeMidNote", () => {
	it("hands the model the unclaimed outcomes rather than asking for them", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			running({ items: [outcome("o1", readable), outcome("o2")] }) as never,
		);
		vi.mocked(checkpointCurator.writeMidNote).mockResolvedValue({
			note: "One outcome has nothing against it.",
		});

		await writeMidNote("cp1");

		expect(checkpointCurator.writeMidNote).toHaveBeenCalledWith(
			expect.objectContaining({
				unproven: [
					{ id: "o2", text: "outcome o2", reason: "missing" },
				],
			}),
			{ checkpointId: "cp1" },
		);
		expect(prisma.projectCheckpoint.update).toHaveBeenCalled();
	});

	it("does not write a second note", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			running({ midNote: "already written" }) as never,
		);

		await expect(writeMidNote("cp1")).resolves.toBeNull();
		expect(checkpointCurator.writeMidNote).not.toHaveBeenCalled();
	});

	it("leaves a checkpoint that is not running alone", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			running({ status: CheckpointStatus.Draft }) as never,
		);

		await expect(writeMidNote("cp1")).resolves.toBeNull();
		expect(checkpointCurator.writeMidNote).not.toHaveBeenCalled();
	});
});

describe("closeCheckpoint", () => {
	it("checks the evidence again before the verdict reads it", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			running() as never,
		);
		vi.mocked(checkpointCurator.writeReport).mockResolvedValue({
			summary: "Done.",
			verdict: CheckpointVerdict.GoalMet,
			verdictNote: "",
		});

		await closeCheckpoint("cp1");

		expect(recheckCheckpointArtifacts).toHaveBeenCalledWith("cp1");
		expect(
			vi.mocked(recheckCheckpointArtifacts).mock.invocationCallOrder[0],
		).toBeLessThan(
			vi.mocked(checkpointCurator.writeReport).mock.invocationCallOrder[0],
		);
	});

	it("leaves a closed checkpoint's evidence alone", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			running({ status: CheckpointStatus.Closed }) as never,
		);

		await expect(closeCheckpoint("cp1")).resolves.toBeNull();
		expect(recheckCheckpointArtifacts).not.toHaveBeenCalled();
	});

	it("writes the report and the settled verdict, and closes", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			running() as never,
		);
		vi.mocked(checkpointCurator.writeReport).mockResolvedValue({
			summary: "The slice is playable.",
			verdict: CheckpointVerdict.StageClosed,
			verdictNote: "Everything owed is proven.",
		});

		await expect(closeCheckpoint("cp1")).resolves.toMatchObject({
			verdict: CheckpointVerdict.StageClosed,
			overrode: null,
		});
		expect(prisma.projectCheckpoint.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					status: CheckpointStatus.Closed,
					verdict: CheckpointVerdict.StageClosed,
				}),
			}),
		);
	});

	it("overrules a verdict the evidence does not support", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			running({ items: [outcome("o1", readable), outcome("o2")] }) as never,
		);
		vi.mocked(checkpointCurator.writeReport).mockResolvedValue({
			summary: "Good progress.",
			verdict: CheckpointVerdict.StageClosed,
			verdictNote: "Looks done.",
		});

		await expect(closeCheckpoint("cp1")).resolves.toMatchObject({
			verdict: CheckpointVerdict.GoalMissed,
			overrode: CheckpointVerdict.StageClosed,
		});
		expect(prisma.projectCheckpoint.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					verdict: CheckpointVerdict.GoalMissed,
				}),
			}),
		);
		expect(journal).toHaveBeenCalledWith(
			expect.objectContaining({
				kind: "Verdict",
				output: expect.objectContaining({
					proposed: CheckpointVerdict.StageClosed,
					settled: CheckpointVerdict.GoalMissed,
				}),
			}),
		);
	});

	it("does not close on a model failure", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			running() as never,
		);
		vi.mocked(checkpointCurator.writeReport).mockResolvedValue(null);

		await expect(closeCheckpoint("cp1")).resolves.toBeNull();
		expect(prisma.projectCheckpoint.update).not.toHaveBeenCalled();
	});

	it("does not decide a checkpoint twice", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			running({
				status: CheckpointStatus.Closed,
				verdict: CheckpointVerdict.GoalMet,
			}) as never,
		);

		await expect(closeCheckpoint("cp1")).resolves.toBeNull();
		expect(checkpointCurator.writeReport).not.toHaveBeenCalled();
	});

	it("sends only the artifacts that are attached, and what is delivered, on trust or not", async () => {
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			running({
				items: [
					outcome("o1", readable),
					outcome("o2", { ...readable, checkStatus: "Unreachable" }),
					outcome("o3"),
				],
			}) as never,
		);
		vi.mocked(checkpointCurator.writeReport).mockResolvedValue({
			summary: "s",
			verdict: CheckpointVerdict.GoalMissed,
			verdictNote: "n",
		});

		await closeCheckpoint("cp1");

		expect(checkpointCurator.writeReport).toHaveBeenCalledWith(
			expect.objectContaining({
				artifacts: [
					expect.objectContaining({ itemId: "o1", readable: true }),
					expect.objectContaining({ itemId: "o2", readable: false }),
				],
				unproven: [
					expect.objectContaining({ id: "o2", reason: "broken" }),
					expect.objectContaining({ id: "o3", reason: "missing" }),
				],
				// Opened, but nothing judged what it shows: counted on trust.
				trusted: [expect.objectContaining({ id: "o1", reason: "unreadable" })],
				partly: [],
			}),
			{ checkpointId: "cp1" },
		);
	});
});

describe("goal check schema", () => {
	it("stays a valid schema before any task is written", async () => {
		const { goalCheckSchema } = await import(
			"@/services/checkpoint-curator/prompts/goal-check"
		);
		const schema = goalCheckSchema({
			card: { goal: "A greybox", inputs: [], outcomes: [] },
			workflow: { currentStage: "Ideation", description: null, requiredTasks: [] },
			team: { members: 1, stated: 0, hoursPerWeek: null, hoursPerRun: null },
			previous: null,
			project: { name: "Lantern Keeper", pitch: null, genre: null },
			author: null,
			picture: "",
		});

		expect(
			schema.properties.notes.items.properties.itemId,
		).not.toHaveProperty("enum");
	});

	it("puts the game and its author in front of the model", async () => {
		const { goalCheckMessages } = await import(
			"@/services/checkpoint-curator/prompts/goal-check"
		);
		const [, user] = goalCheckMessages({
			card: { goal: "A greybox", inputs: [], outcomes: [] },
			workflow: { currentStage: "Ideation", description: null, requiredTasks: [] },
			team: { members: 1, stated: 0, hoursPerWeek: null, hoursPerRun: null },
			previous: null,
			project: { name: "Lantern Keeper", pitch: "Ships by night", genre: "Puzzle" },
			author: {
				speciality: "Programmer",
				level: "Beginner",
				experience: "Two jam games in Godot",
			},
			picture: "",
		});

		expect(user.content).toContain("Lantern Keeper (Puzzle)");
		expect(user.content).toContain('"Two jam games in Godot"');
		expect(user.content).toContain('"Ships by night"');
		expect(user.content).toContain("Programmer, Beginner level");
	});
});

describe("the goal check's stored read", () => {
	it("is not paid for again because the project picture moved on", () => {
		const input = {
			card: { goal: "A greybox", inputs: [], outcomes: [] },
			workflow: { currentStage: "Ideation", description: null, requiredTasks: [] },
			team: { members: 1, stated: 0, hoursPerWeek: null, hoursPerRun: null },
			previous: null,
			project: { name: "Lantern Keeper", pitch: null, genre: null },
			author: null,
		};

		expect(goalCheckHash({ ...input, picture: "Monday" })).toBe(
			goalCheckHash({ ...input, picture: "Tuesday" }),
		);
		expect(goalCheckHash({ ...input, picture: "" })).not.toBe(
			goalCheckHash({
				...input,
				card: { ...input.card, goal: "A vertical slice" },
				picture: "",
			}),
		);
	});
});

describe("writeVerdictRead", () => {
	it("proposes from the evidence and the calls, and decides nothing", async () => {
		vi.mocked(prisma.checkpointJournalEntry.findFirst).mockResolvedValue(null);
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
			running({
				curatorKind: "Human",
				status: CheckpointStatus.Review,
				sessions: [
					{
						index: 1,
						content: {
							inShort: "Plan set.",
							agreed: [{ text: "Lock the loop", itemId: null, dueDay: null }],
						},
					},
				],
			}) as never,
		);
		vi.mocked(checkpointCurator.writeReport).mockResolvedValue({
			summary: "All proven.",
			verdict: CheckpointVerdict.StageClosed,
			verdictNote: "The loop is locked.",
		});

		await expect(writeVerdictRead("cp1")).resolves.toBe(true);

		const [input, options] = vi.mocked(checkpointCurator.writeReport).mock
			.calls[0];
		expect(input.calls).toEqual([
			{ index: 1, inShort: "Plan set.", agreed: ["Lock the loop"] },
		]);
		expect(options).toMatchObject({ purpose: "verdictRead" });
		expect(journal).toHaveBeenCalledWith(
			expect.objectContaining({
				kind: "Verdict",
				output: expect.objectContaining({
					proposed: CheckpointVerdict.StageClosed,
					settled: null,
				}),
			}),
		);
		expect(prisma.projectCheckpoint.update).not.toHaveBeenCalled();
	});

	it("is written once", async () => {
		vi.mocked(prisma.checkpointJournalEntry.findFirst).mockResolvedValue({
			id: "e1",
		} as never);

		await expect(writeVerdictRead("cp1")).resolves.toBe(false);
		expect(checkpointCurator.writeReport).not.toHaveBeenCalled();
	});
});
