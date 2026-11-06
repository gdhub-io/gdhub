import { EventStatus, ProjectStatus } from "@gdhub-io/gdhub-prisma";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = {
	members: vi.fn(),
	projects: vi.fn(),
	events: vi.fn(),
};

vi.mock("@/services/cache", () => ({ cached: vi.fn() }));

vi.mock("@/services/prisma", () => ({
	prisma: {
		spaceMember: { findMany: (...a: unknown[]) => db.members(...a) },
		scoutCabinet: { findUnique: async () => null },
		speciality: { count: async () => 0 },
		project: { findMany: (...a: unknown[]) => db.projects(...a) },
		event: { findMany: (...a: unknown[]) => db.events(...a) },
	},
}));

const { loadUserSpaces } = await import("@/repositories/user/spaces");

const now = new Date("2026-11-06T12:00:00Z");

beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers();
	vi.setSystemTime(now);
	db.members.mockResolvedValue([
		{ spaceType: "project", spaceId: "p1", role: "Owner" },
		{ spaceType: "event", spaceId: "e1", role: "Owner" },
	]);
	db.projects.mockResolvedValue([]);
	db.events.mockResolvedValue([]);
});

afterEach(() => vi.useRealTimers());

describe("loadUserSpaces", () => {
	it("leaves archived projects out of the switcher", async () => {
		await loadUserSpaces("u1");

		expect(db.projects.mock.calls[0][0].where).toEqual({
			id: { in: ["p1"] },
			status: { not: ProjectStatus.Archived },
		});
	});

	it("leaves closed, archived and finished events out", async () => {
		await loadUserSpaces("u1");

		expect(db.events.mock.calls[0][0].where).toEqual({
			id: { in: ["e1"] },
			status: { notIn: [EventStatus.Closed, EventStatus.Archived] },
			NOT: { schedule: { some: {}, every: { endDate: { lt: now } } } },
		});
	});

});
