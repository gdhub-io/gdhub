import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/services/prisma";

vi.mock("../src/services/prisma", () => ({
	prisma: {
		project: { findFirst: vi.fn() },
		projectReport: { findMany: vi.fn() },
		projectArtifact: { findMany: vi.fn() },
		teamMember: { findMany: vi.fn() },
		teamVacancy: { findMany: vi.fn() },
		projectWorkflowStep: { findMany: vi.fn() },
		projectCheckpoint: { findMany: vi.fn() },
		teamInvitation: { findMany: vi.fn() },
	},
}));

import { getProjectActivity } from "../src/repositories/project-activity.repository";

const at = (iso: string) => new Date(iso);

const member = (
	id: string,
	userId: string,
	createdAt: string,
	vacancyId: string | null = null,
) => ({
	id,
	userId,
	vacancyId,
	createdAt: at(createdAt),
	startedAt: at(createdAt),
	position: "Sound designer",
	user: { name: userId },
	speciality: null,
});

beforeEach(() => {
	vi.clearAllMocks();
	for (const findMany of [
		prisma.projectReport.findMany,
		prisma.projectArtifact.findMany,
		prisma.teamMember.findMany,
		prisma.teamVacancy.findMany,
		prisma.projectWorkflowStep.findMany,
		prisma.projectCheckpoint.findMany,
		prisma.teamInvitation.findMany,
	]) {
		vi.mocked(findMany).mockResolvedValue([] as never);
	}
	vi.mocked(prisma.project.findFirst).mockResolvedValue(null);
});

describe("getProjectActivity — joining the team", () => {
	it("keeps the joining of a member who was fired since", async () => {
		await getProjectActivity("p1", { before: new Date(), limit: 20 });

		const joinedWhere = vi.mocked(prisma.teamMember.findMany).mock.calls[0][0]
			?.where as { status: unknown };
		expect(joinedWhere.status).toEqual({ in: ["Hired", "Fired"] });
	});

	it("names who invited a member, and nobody for a hire from a vacancy", async () => {
		vi.mocked(prisma.teamMember.findMany)
			.mockResolvedValueOnce([
				member("m1", "invited", "2026-10-09T00:44:00Z"),
				member("m2", "hired", "2026-10-08T10:00:00Z", "v1"),
			] as never)
			.mockResolvedValueOnce([]);
		vi.mocked(prisma.teamInvitation.findMany).mockResolvedValue([
			{
				userId: "invited",
				acceptedAt: at("2026-10-09T00:43:59Z"),
				invitedBy: { name: "Matt" },
			},
		] as never);

		const { events } = await getProjectActivity("p1", {
			before: new Date(),
			limit: 20,
		});

		expect(events.find((e) => e.id === "joined-m1")?.invitedBy).toBe("Matt");
		expect(events.find((e) => e.id === "joined-m2")?.invitedBy).toBeNull();
	});

	it("takes the invitation behind this joining, not a later one", async () => {
		vi.mocked(prisma.teamMember.findMany)
			.mockResolvedValueOnce([
				member("m1", "u1", "2026-09-01T00:00:00Z"),
			] as never)
			.mockResolvedValueOnce([]);
		// Newest first, as the query orders them: a re-invite after leaving.
		vi.mocked(prisma.teamInvitation.findMany).mockResolvedValue([
			{
				userId: "u1",
				acceptedAt: at("2026-10-01T00:00:00Z"),
				invitedBy: { name: "Later" },
			},
			{
				userId: "u1",
				acceptedAt: at("2026-08-31T23:59:00Z"),
				invitedBy: { name: "First" },
			},
		] as never);

		const { events } = await getProjectActivity("p1", {
			before: new Date(),
			limit: 20,
		});

		expect(events[0].invitedBy).toBe("First");
	});
});
