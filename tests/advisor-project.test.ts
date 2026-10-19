import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAdvisorProject } from "@/repositories/advisor-checkpoints";
import { getCheckpoint } from "@/repositories/checkpoint.repository";
import { prisma } from "@/services/prisma";

vi.mock("@/services/prisma", () => ({
	prisma: { projectCheckpoint: { findFirst: vi.fn() } },
}));

// The pulse and devlogs come from the checkpoint page's own read.
vi.mock("@/repositories/checkpoint.repository", async (importOriginal) => ({
	...(await importOriginal<object>()),
	getCheckpoint: vi.fn().mockResolvedValue({
		status: "Active",
		sprints: [],
		pulses: [{ memberId: "m1", cells: [{ sprint: 1, state: "confirmed" }] }],
		reports: [],
	}),
}));

const row = {
	project: {
		name: "Hollow Tide",
		description: null,
		coverImage: null,
		videoLink: null,
		startedAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-09-01"),
		genre: "Puzzle",
		platform: null,
		setting: null,
		visualStyle: null,
		audition: null,
		links: [],
		reports: [],
		workflow: { currentStep: { name: "Prototyping" } },
		team: {
			members: [
				{
					id: "m1",
					position: "Lead designer",
					status: "Founder",
					startedAt: new Date("2026-01-01"),
					speciality: {
						name: "Game design",
						level: "Expert",
						specialization: "Two shipped mobile puzzlers",
					},
					user: { profile: { timeForWork: [10, 20], timezone: "Europe/Tallinn" } },
				},
				{
					id: "m2",
					position: "Artist",
					status: "Hired",
					startedAt: new Date("2026-03-01"),
					speciality: {
						name: "2D art",
						level: "Middle",
						specialization: "Their own words",
					},
					user: { profile: { timeForWork: null, timezone: "Asia/Tokyo" } },
				},
			],
		},
	},
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(prisma.projectCheckpoint.findFirst).mockResolvedValue(row as never);
});

// A curator reaches the project through a checkpoint they are named on, and
// reads its team as roles: this is not the scout's card.
describe("the project as its curator reads it", () => {
	it("is found only through a checkpoint handed to this curator", async () => {
		await getAdvisorProject("cp1", "u9");

		expect(prisma.projectCheckpoint.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: "cp1", curatorId: "u9" } }),
		);
	});

	it("is nothing for anybody else", async () => {
		vi.mocked(prisma.projectCheckpoint.findFirst).mockResolvedValue(null);

		expect(await getAdvisorProject("cp1", "u9")).toBeNull();
	});

	it("names nobody on the team", async () => {
		const project = await getAdvisorProject("cp1", "u9");

		expect(project?.team[0]).toEqual({
			id: "m1",
			position: "Lead designer",
			speciality: { name: "Game design", level: "Expert" },
			isFounder: true,
			hoursPerWeek: [10, 20],
			startedAt: new Date("2026-01-01"),
			pulse: [{ sprint: 1, state: "confirmed" }],
		});
	});

	it("gives the author's words and time zone, and nobody else's", async () => {
		const project = await getAdvisorProject("cp1", "u9");

		expect(project?.author).toEqual({
			experience: "Two shipped mobile puzzlers",
			timezone: "Europe/Tallinn",
		});
		expect(project?.team[1]).toEqual(
			expect.not.objectContaining({ experience: expect.anything() }),
		);
		expect(project?.team[1].speciality).toEqual({
			name: "2D art",
			level: "Middle",
		});
	});

	it("reads back the project's last closed checkpoint, not this one", async () => {
		vi.mocked(prisma.projectCheckpoint.findFirst)
			.mockResolvedValueOnce({ ...row, projectId: "p1" } as never)
			.mockResolvedValueOnce({
				verdict: "GoalMissed",
				verdictNote: "Nobody outside the team played it.",
			} as never);

		const project = await getAdvisorProject("cp1", "u9");

		expect(project?.previous).toEqual({
			verdict: "GoalMissed",
			note: "Nobody outside the team played it.",
		});
		expect(prisma.projectCheckpoint.findFirst).toHaveBeenLastCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					projectId: "p1",
					id: { not: "cp1" },
					status: "Closed",
				}),
			}),
		);
	});

	it("keeps the pulse and devlogs from a curator who has not taken it on yet", async () => {
		vi.mocked(getCheckpoint).mockResolvedValueOnce({
			status: "AwaitingCurator",
			sprints: [{ number: 1 }],
			pulses: [{ memberId: "m1", cells: [{ sprint: 1, state: "confirmed" }] }],
			reports: [{ id: "r1", publishedAt: new Date(), content: "x", sprint: 1 }],
		} as never);

		const project = await getAdvisorProject("cp1", "u9");

		expect(project?.team[0].pulse).toEqual([]);
		expect(project?.sprints).toEqual([]);
		expect(project?.devlogs).toEqual([]);
	});

	it("counts only stated hours towards the team's capacity", async () => {
		const project = await getAdvisorProject("cp1", "u9");

		expect(project?.capacity).toMatchObject({
			members: 2,
			stated: 1,
			hoursPerWeek: { from: 10, to: 20 },
			hoursPerRun: { from: 40, to: 80 },
		});
	});
});
