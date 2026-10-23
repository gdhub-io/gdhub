import { beforeEach, describe, expect, it, vi } from "vitest";
import { devlogText } from "@/lib/curator-text";
import { projectPicture } from "@/repositories/curator-context";
import { getProjectActivity } from "@/repositories/project-activity.repository";
import { prisma } from "@/services/prisma";

vi.mock("@/repositories/project-activity.repository", () => ({
	getProjectActivity: vi.fn(),
}));
vi.mock("@/services/prisma", () => ({
	prisma: {
		projectCheckpoint: { findUniqueOrThrow: vi.fn() },
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
		],
	} as never);
	vi.mocked(prisma.projectWorkflowStep.findFirst).mockResolvedValue({
		name: "Demo version",
	} as never);
	vi.mocked(prisma.teamMember.findMany).mockResolvedValue([
		{
			id: "m1",
			position: "Programmer",
			speciality: { name: "Developer", level: "Middle" },
			user: { name: "Marta", profile: { timeForWork: [5, 10] } },
		},
	] as never);
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
	it("says what has to be done on the stage to move to the next one", async () => {
		const picture = await projectPicture("cp1", period);

		expect(picture).toContain('To move on to "Demo version"');
		expect(picture).toContain("- [x] Playable greybox (required)");
		expect(picture).toContain("- [ ] Playtest with five people (required)");
	});

	it("names each member's role, hours and the weeks they worked", async () => {
		const picture = await projectPicture("cp1", period);

		expect(picture).toContain(
			"- Marta: Programmer, Middle, 5–10 h/week stated; week 1 worked, week 2 not confirmed",
		);
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
		expect(devlogText(long)).toContain("[…shortened, 500 more characters]");
	});
});

describe("a stage whose description lives elsewhere", () => {
	it("shows no pointer in place of text", async () => {
		vi.mocked(prisma.projectWorkflowStep.findUnique).mockResolvedValue({
			order: 1,
			description: "notion::gamelab-pipeline.ideation",
			projectWorkflowId: "wf",
			tasks: [],
		} as never);

		const picture = await projectPicture("cp1", period);

		expect(picture).toContain("Stage: Prototyping.\n");
		expect(picture).not.toContain("notion::");
	});
});
