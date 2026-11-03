import { beforeEach, describe, expect, it, vi } from "vitest";
import { CURATOR_STAGE_BRIEFS } from "@/config/checkpoint";

const STAGE_GOAL = "The core works and the style is chosen.";
const PROJECT_GOAL = "The game is released and people play it.";

import { devlogText } from "@/lib/checkpoints/curator-text";
import { lensWeights } from "@/lib/checkpoints/lenses";
import {
	curatorTeam,
	projectPicture,
	stageWorkflow,
} from "@/repositories/checkpoints/ai-curator-context";
import { getProjectActivity } from "@/repositories/project/activity";
import { prisma } from "@/services/prisma";

vi.mock("@/repositories/project/activity", () => ({
	getProjectActivity: vi.fn(),
}));
vi.mock("@/services/prisma", () => ({
	prisma: {
		projectCheckpoint: { findUniqueOrThrow: vi.fn() },
		teamVacancy: { findMany: vi.fn() },
		projectWorkflowStep: { findUnique: vi.fn(), findFirst: vi.fn() },
		teamMember: { findMany: vi.fn() },
		checkpointPulse: { findMany: vi.fn() },
	},
}));

const event = (at: string, kind: string, actor: string, subject: string) => ({
	id: `${kind}-${at}`,
	at,
	kind,
	actor,
	subject,
});

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(prisma.projectCheckpoint.findUniqueOrThrow).mockResolvedValue({
		projectId: "p1",
		stepId: "step-2",
		stageName: "Prototyping",
		startedAt: new Date("2026-10-01T00:00:00Z"),
	} as never);
	vi.mocked(prisma.projectWorkflowStep.findUnique).mockResolvedValue({
		order: 2,
		description: "Make the core loop playable.",
		projectWorkflowId: "wf",
		tasks: [
			{ name: "Playable greybox", required: true, done: true },
			{ name: "Playtest with five people", required: true, done: false },
			{ name: "Collect 10 applause", required: false, done: false },
		],
	} as never);
	vi.mocked(prisma.projectWorkflowStep.findFirst).mockResolvedValue({
		name: "Demo version",
	} as never);
	vi.mocked(prisma.teamMember.findMany).mockResolvedValue([
		{
			id: "m1",
			startedAt: new Date("2026-09-01T00:00:00Z"),
			position: "Programmer",
			speciality: { name: "Developer", level: "Middle" },
			user: { name: "Marta", profile: { timeForWork: [5, 10] } },
		},
	] as never);
	vi.mocked(prisma.teamVacancy.findMany).mockResolvedValue([]);
	vi.mocked(prisma.checkpointPulse.findMany).mockResolvedValue([
		{ teamMemberId: "m1", week: 2, confirmedAt: null },
		{ teamMemberId: "m1", week: 1, confirmedAt: new Date() },
	] as never);
	vi.mocked(getProjectActivity).mockResolvedValue({
		events: [
			event("2026-10-09T10:00:00Z", "left", "Tom", "Artist"),
			event("2026-10-08T10:00:00Z", "stage", "Anna", "Ideation"),
			event("2026-10-05T10:00:00Z", "artifact", "Marta", "Greybox build"),
			event("2026-10-04T10:00:00Z", "devlog", "Anna", "#3"),
			event("2026-09-01T10:00:00Z", "joined", "Old", "Writer"),
		],
		next: null,
	} as never);
});

const period = {
	from: new Date("2026-10-01T00:00:00Z"),
	to: new Date("2026-10-15T00:00:00Z"),
};

describe("the project picture the AI curator reads", () => {
	it("is the activity alone: the stage and the team have blocks of their own", async () => {
		const picture = await projectPicture("cp1", period);

		expect(picture).not.toContain("Stage:");
		expect(picture).not.toContain("Team");
		expect(picture).toMatch(/^What happened on the project from 2026-10-01/);
	});

	it("says the two weeks before the start are before it, on day 1", async () => {
		const picture = await projectPicture("cp1");

		expect(picture).toContain(
			"What happened on the project in the two weeks before the checkpoint started, from 2026-09-17",
		);
	});

	it("leaves out the tasks a stage only suggests: they are the author's call", async () => {
		const picture = await projectPicture("cp1", period);

		expect(picture).not.toContain("Collect 10 applause");
	});

	it("builds the team once: role, level, hours, the weeks they worked, and the sums", async () => {
		await expect(curatorTeam("cp1", "p1", new Date("2026-10-01T00:00:00Z"))).resolves.toEqual({
			members: 1,
			stated: 1,
			hoursPerWeek: { from: 5, to: 10 },
			hoursPerRun: { from: 20, to: 40 },
			people: [
				{
					name: "Marta",
					// The project's own title wins over the speciality.
					role: "Programmer",
					level: "Middle",
					hoursPerWeek: { from: 5, to: 10 },
					weeks: [true, false],
					joinedOn: null,
				},
			],
			openings: [],
		});
	});

	it("marks who joined during the checkpoint, and lists the positions open now", async () => {
		vi.mocked(prisma.teamMember.findMany).mockResolvedValue([
			{
				id: "m2",
				startedAt: new Date("2026-10-10T09:00:00Z"),
				position: "2D artist",
				speciality: null,
				user: { name: "Lena", profile: null },
			},
		] as never);
		vi.mocked(prisma.checkpointPulse.findMany).mockResolvedValue([]);
		vi.mocked(prisma.teamVacancy.findMany).mockResolvedValue([
			{
				title: "Sound designer",
				publishedAt: new Date("2026-10-12T00:00:00Z"),
				createdAt: new Date("2026-10-11T00:00:00Z"),
				_count: { applicants: 3 },
			},
		] as never);

		await expect(curatorTeam("cp1", "p1", new Date("2026-10-01T00:00:00Z"))).resolves.toMatchObject({
			people: [{ name: "Lena", joinedOn: "2026-10-10" }],
			openings: [{ role: "Sound designer", postedOn: "2026-10-12", applied: 3 }],
		});
		expect(vi.mocked(prisma.teamVacancy.findMany).mock.calls[0][0]?.where).toMatchObject({
			status: "Published",
		});
	});

	it("never reads a member who stated nothing as a member with no hours", async () => {
		vi.mocked(prisma.teamMember.findMany).mockResolvedValue([
			{
				id: "m1",
				startedAt: new Date("2026-09-01T00:00:00Z"),
				position: null,
				speciality: { name: "Artist", level: null },
				user: { name: "Tom", profile: { timeForWork: [] } },
			},
		] as never);
		vi.mocked(prisma.checkpointPulse.findMany).mockResolvedValue([]);

		await expect(curatorTeam("cp1", "p1", new Date("2026-10-01T00:00:00Z"))).resolves.toMatchObject({
			members: 1,
			stated: 0,
			hoursPerWeek: null,
			hoursPerRun: null,
			people: [{ role: "Artist", hoursPerWeek: null, weeks: [] }],
		});
	});

	it("lists what happened in the period, oldest first, without stage moves or devlogs", async () => {
		const picture = await projectPicture("cp1", period);

		expect(picture).toContain('2026-10-05 · Marta added "Greybox build"');
		expect(picture).toContain("2026-10-09 · Tom (Artist) left");
		expect(picture.indexOf("Greybox build")).toBeLessThan(
			picture.indexOf("Tom (Artist) left"),
		);
		expect(picture).not.toContain("Ideation");
		expect(picture).not.toContain("#3");
		expect(picture).not.toContain("Old joined");
	});
});

describe("a devlog as the curator reads it", () => {
	it("is shortened with a mark, never silently", () => {
		const long = "x".repeat(3000);

		expect(devlogText("short")).toBe("short");
		expect(devlogText(long)).toContain("[…500 more characters not read]");
	});
});

describe("the stage as the curator reads it", () => {
	it("names the next stage, the required tasks done or not, and the curator's own brief", async () => {
		vi.mocked(prisma.projectWorkflowStep.findUnique).mockResolvedValue({
			order: 2,
			name: "Prototyping",
			projectWorkflowId: "wf",
			projectWorkflow: {
				schema: {
					goal: PROJECT_GOAL,
					steps: [{}, {}, { name: "Prototyping", goal: STAGE_GOAL, tasks: [] }],
				},
			},
			// The query asks for the required tasks only.
			tasks: [
				{ name: "Playable greybox", done: true },
				{ name: "Playtest with five people", done: false },
			],
		} as never);

		await expect(stageWorkflow("step-2", "Prototyping")).resolves.toEqual({
			projectGoal: PROJECT_GOAL,
			currentStage: "Prototyping",
			nextStage: "Demo version",
			description: CURATOR_STAGE_BRIEFS.Prototyping,
			goal: STAGE_GOAL,
			lenses: lensWeights("Prototyping"),
			requiredTasks: [
				{ name: "Playable greybox", done: true },
				{ name: "Playtest with five people", done: false },
			],
		});
		expect(prisma.projectWorkflowStep.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				select: expect.objectContaining({
					tasks: expect.objectContaining({ where: { required: true } }),
				}),
			}),
		);
	});

	it("finds the goal by the stage's name when the project's steps moved", async () => {
		vi.mocked(prisma.projectWorkflowStep.findUnique).mockResolvedValue({
			order: 0,
			name: "prototyping",
			projectWorkflowId: "wf",
			projectWorkflow: {
				schema: {
					goal: PROJECT_GOAL,
					steps: [
						{ name: "Ideation", goal: "Ideation goal", tasks: [] },
						{ name: "Prototyping", goal: STAGE_GOAL, tasks: [] },
					],
				},
			},
			tasks: [],
		} as never);

		expect((await stageWorkflow("step", "Prototyping")).goal).toBe(STAGE_GOAL);
	});

	it("reads the project's own stage goal before the template's", async () => {
		vi.mocked(prisma.projectWorkflowStep.findUnique).mockResolvedValue({
			order: 0,
			name: "Prototyping",
			goal: "Only this project's goal.",
			projectWorkflowId: "wf",
			projectWorkflow: {
				schema: {
					goal: PROJECT_GOAL,
					steps: [{ name: "Prototyping", goal: STAGE_GOAL, tasks: [] }],
				},
			},
			tasks: [],
		} as never);

		expect((await stageWorkflow("step", "Prototyping")).goal).toBe(
			"Only this project's goal.",
		);
	});

	it("keeps the goal by position when the template renamed the stage", async () => {
		vi.mocked(prisma.projectWorkflowStep.findUnique).mockResolvedValue({
			order: 1,
			name: "Prototyping",
			projectWorkflowId: "wf",
			projectWorkflow: {
				schema: {
					goal: PROJECT_GOAL,
					steps: [
						{ name: "Ideation", goal: "Ideation goal", tasks: [] },
						{ name: "Prototype", goal: STAGE_GOAL, tasks: [] },
					],
				},
			},
			tasks: [],
		} as never);

		expect((await stageWorkflow("step", "Prototyping")).goal).toBe(STAGE_GOAL);
	});

	it("never hands the model the author's stage text, and states no goal it does not have", async () => {
		await expect(stageWorkflow(null, "A stage of our own")).resolves.toEqual({
			projectGoal: null,
			currentStage: "A stage of our own",
			nextStage: null,
			description: null,
			goal: null,
			lenses: lensWeights("A stage of our own"),
			requiredTasks: [],
		});
	});
});

// GDHUB-125: every prompt reads the chain from the same block.
describe("renderWorkflow", () => {
	it("gives the model the project goal and the stage goal", async () => {
		const { renderWorkflow } = await import(
			"@/services/checkpoints/ai-curator/prompts/card"
		);
		const text = renderWorkflow({
			projectGoal: PROJECT_GOAL,
			currentStage: "Prototyping",
			nextStage: null,
			description: null,
			goal: STAGE_GOAL,
			lenses: lensWeights("Prototyping"),
			requiredTasks: [],
		});
		expect(text).toContain(`Project goal: ${PROJECT_GOAL}`);
		expect(text).toContain(STAGE_GOAL);
	});
});
