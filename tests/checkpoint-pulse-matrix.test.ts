import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCheckpoint } from "@/repositories/checkpoint.repository";
import { prisma } from "@/services/prisma";

vi.mock("@/services/prisma", () => ({
	prisma: {
		projectCheckpoint: { findUnique: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
		projectArtifact: { findMany: vi.fn(async () => []) },
	},
}));

/**
 * The checkpoint page in one request: the four sprints, the pulse matrix and the
 * evidence. A Tuesday start, so nothing here can agree with a calendar week by
 * accident — sprint 1 is Sep 1–7, sprint 3 Sep 15–21.
 */

const startedAt = new Date("2026-09-01T09:00:00.000Z");
const at = (iso: string) => new Date(iso);

const artifact = (
	id: string,
	createdAt: string,
	name = "Build",
): Record<string, unknown> => ({
	id,
	name,
	type: "Build",
	link: `https://example.test/${id}`,
	checkStatus: "Readable",
	createdAt: at(createdAt),
	createdByUser: { id: "u1", name: "Marta Ilves", image: null },
});

const member = (
	id: string,
	joined: string,
	left: string | null = null,
	speciality: { name: string } | null = { name: "Game Designer" },
) => ({
	id,
	startedAt: at(joined),
	finishedAt: left ? at(left) : null,
	position: "Producer",
	user: { id: `user-${id}`, name: `Member ${id}`, image: null },
	speciality,
});

const pulse = (
	teamMemberId: string,
	week: number,
	confirmedAt: string | null,
	source: string | null = null,
) => ({
	teamMemberId,
	week,
	confirmedAt: confirmedAt ? at(confirmedAt) : null,
	source,
});

type Row = Record<string, unknown>;

const detailRow = (overrides: Row = {}): Row => ({
	id: "cp1",
	projectId: "p1",
	startedAt,
	items: [],
	reports: [],
	pulses: [],
	artifacts: [],
	sessions: [],
	project: { team: { members: [] } },
	...overrides,
});

const load = async (overrides: Row = {}) => {
	vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
		detailRow(overrides) as never,
	);

	const checkpoint = await getCheckpoint("cp1");
	if (!checkpoint) throw new Error("fixture missing");

	return checkpoint;
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers();
	// Day 17 of 28: sprints 1 and 2 are over, sprint 3 is under way.
	vi.setSystemTime(at("2026-09-17T12:00:00.000Z"));
});

afterEach(() => {
	vi.useRealTimers();
});

describe("sprints", () => {
	it("cuts the 28 days into four, dated from the start and stamped with a state", async () => {
		const { sprints } = await load();

		expect(sprints[0]).toEqual({
			number: 1,
			from: "2026-09-01T00:00:00.000Z",
			to: "2026-09-07T00:00:00.000Z",
			firstDay: 1,
			lastDay: 7,
			devlogDay: 6,
			state: "done",
		});
		expect(sprints.map((sprint) => sprint.state)).toEqual([
			"done",
			"done",
			"current",
			"ahead",
		]);
	});

	it("calls the fourth sprint done once its last day has passed", async () => {
		vi.setSystemTime(at("2026-10-02T12:00:00.000Z"));

		const { sprints } = await load();

		expect(sprints.map((sprint) => sprint.state)).toEqual([
			"done",
			"done",
			"done",
			"done",
		]);
	});

	it("gives a draft no sprints at all — there are no dates to divide", async () => {
		const checkpoint = await load({
			startedAt: null,
			project: { team: { members: [member("m1", "2026-08-01T00:00:00.000Z")] } },
		});

		expect(checkpoint.sprints).toEqual([]);
		expect(checkpoint.pulses[0].cells).toEqual([]);
	});
});

describe("pulse matrix", () => {
	it("blanks the sprints before a member joined and reads the rest for real", async () => {
		const { pulses } = await load({
			project: {
				team: { members: [member("m2", "2026-09-16T08:00:00.000Z")] },
			},
			// The sprint-1 row is the trap: asked and never answered, but they were
			// not on the team, so the cell is blank rather than a miss.
			pulses: [pulse("m2", 1, null), pulse("m2", 3, null)],
		});

		expect(pulses[0].cells.map((cell) => cell.state)).toEqual([
			"notOnTeam",
			"notOnTeam",
			"waiting",
			"notAsked",
		]);
		expect(pulses[0]).toMatchObject({
			memberId: "m2",
			userId: "user-m2",
			role: "Game Designer",
			joinedAt: "2026-09-16T08:00:00.000Z",
			leftAt: null,
		});
	});

	it("blanks the sprints after a member left", async () => {
		const { pulses } = await load({
			project: {
				team: {
					members: [
						member("m3", "2026-08-10T00:00:00.000Z", "2026-09-07T10:00:00.000Z"),
					],
				},
			},
			pulses: [pulse("m3", 1, null)],
		});

		expect(pulses[0].cells.map((cell) => cell.state)).toEqual([
			"missed",
			"notOnTeam",
			"notOnTeam",
			"notOnTeam",
		]);
		expect(pulses[0].leftAt).toBe("2026-09-07T10:00:00.000Z");
	});

	it("says notAsked for a past sprint nobody was asked about, not missed", async () => {
		const { pulses } = await load({
			project: { team: { members: [member("m1", "2026-08-01T00:00:00.000Z")] } },
			pulses: [
				pulse("m1", 1, "2026-09-05T09:00:00.000Z", "email"),
				pulse("m1", 3, null),
			],
		});

		expect(pulses[0].cells).toEqual([
			{
				sprint: 1,
				state: "confirmed",
				confirmedAt: "2026-09-05T09:00:00.000Z",
				source: "email",
			},
			{ sprint: 2, state: "notAsked", confirmedAt: null, source: null },
			{ sprint: 3, state: "waiting", confirmedAt: null, source: null },
			{ sprint: 4, state: "notAsked", confirmedAt: null, source: null },
		]);
	});

	it("falls back to the position when the member has no speciality", async () => {
		const { pulses } = await load({
			project: {
				team: { members: [member("m1", "2026-08-01T00:00:00.000Z", null, null)] },
			},
		});

		expect(pulses[0].role).toBe("Producer");
	});
});

describe("evidence", () => {
	it("unions the checkpoint's own artifacts with the ones its items point at", async () => {
		const older = artifact("a-old", "2026-07-01T10:00:00.000Z", "Last stage's build");
		const made = artifact("a-new", "2026-09-10T10:00:00.000Z");

		const { evidence } = await load({
			artifacts: [made],
			items: [
				{ id: "i1", artifact: older },
				{ id: "i2", artifact: made },
				{ id: "i3", artifact: null },
			],
		});

		expect(evidence).toHaveLength(2);
		expect(evidence[0]).toEqual({
			artifact: {
				id: "a-old",
				name: "Last stage's build",
				type: "Build",
				link: "https://example.test/a-old",
				checkStatus: "Readable",
			},
			addedAt: "2026-07-01T10:00:00.000Z",
			addedBy: { id: "u1", name: "Marta Ilves", image: null },
			itemIds: ["i1"],
			sprint: null,
		});
		expect(evidence[1]).toMatchObject({
			itemIds: ["i2"],
			sprint: 2,
		});
	});

	it("lists an artifact twice over — offered and made here — only once", async () => {
		const made = artifact("a-new", "2026-09-10T10:00:00.000Z");

		const { evidence } = await load({
			artifacts: [made],
			items: [
				{ id: "i1", artifact: made },
				{ id: "i2", artifact: made },
			],
		});

		expect(evidence).toHaveLength(1);
		expect(evidence[0].itemIds).toEqual(["i1", "i2"]);
	});
});

describe("reports", () => {
	it("files each devlog in the sprint it landed in", async () => {
		const { reports } = await load({
			reports: [
				{ id: "r2", publishedAt: at("2026-09-13T10:00:00.000Z") },
				{ id: "r1", publishedAt: at("2026-09-06T10:00:00.000Z") },
			],
		});

		expect(reports.map((report) => report.sprint)).toEqual([2, 1]);
	});

	it("leaves the sprint null while the checkpoint has not started", async () => {
		const { reports } = await load({
			startedAt: null,
			reports: [{ id: "r1", publishedAt: at("2026-08-20T10:00:00.000Z") }],
		});

		expect(reports[0].sprint).toBeNull();
	});
});
