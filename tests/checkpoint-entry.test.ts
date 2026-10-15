import {
	ArtifactCheckStatus,
	CheckpointItemKind,
	CheckpointStatus,
	ProjectArtifactType,
} from "@gdhub-io/gdhub-prisma";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const getCreationBlocker = vi.fn();
const createDraftCheckpoint = vi.fn();
const replaceCheckpointItems = vi.fn();
const ensureCheckpointStage = vi.fn();
const checkpointNumber = vi.fn();

const db = {
	teamMember: { count: vi.fn() },
	projectArtifact: { findMany: vi.fn() },
	projectCheckpoint: { findFirst: vi.fn(), update: vi.fn(), count: vi.fn() },
	profile: { findUnique: vi.fn() },
	speciality: { count: vi.fn() },
	project: { findMany: vi.fn() },
};

vi.mock("@/auth", () => ({ auth: () => authMock() }));
vi.mock("@/services/prisma", () => ({ prisma: db }));
vi.mock("@/repositories/checkpoint.repository", () => ({
	getCreationBlocker: (...args: unknown[]) => getCreationBlocker(...args),
	createDraftCheckpoint: (...args: unknown[]) => createDraftCheckpoint(...args),
	replaceCheckpointItems: (...args: unknown[]) => replaceCheckpointItems(...args),
	toArtifactRef: <T>(artifact: T) => artifact,
}));
vi.mock("@/repositories/project-workflow", () => ({
	ensureCheckpointStage: (...args: unknown[]) => ensureCheckpointStage(...args),
}));
vi.mock("@/repositories/checkpoint-number", () => ({
	checkpointNumber: (...args: unknown[]) => checkpointNumber(...args),
}));

const { carryOverItems, getEntryPrefill, getEntryStatus } = await import(
	"@/repositories/checkpoint-entry"
);

const artifact = (id: string, checkStatus: ArtifactCheckStatus | null) => ({
	id,
	name: id,
	type: ProjectArtifactType.ExecutableBuild,
	link: `https://example.com/${id}`,
	checkStatus,
});

const outcome = (
	text: string,
	{ cut = false, check = ArtifactCheckStatus.Readable as ArtifactCheckStatus | null, withArtifact = true } = {},
) => ({
	kind: CheckpointItemKind.Outcome,
	text,
	cut,
	artifact: withArtifact ? artifact(`a-${text}`, check) : null,
});

const input = (text: string) => ({
	kind: CheckpointItemKind.Input,
	text,
	cut: false,
	artifact: null,
});

beforeEach(() => {
	vi.clearAllMocks();
	authMock.mockResolvedValue({ user: { id: "u1", lang: "en" } });
});

describe("carryOverItems", () => {
	it("puts delivered outcomes first, then inputs, and stops at five", () => {
		const carried = carryOverItems([
			input("Greybox level"),
			outcome("Playable slice"),
			input("Design doc"),
			outcome("Cut feature", { cut: true }),
			outcome("Broken build", { check: ArtifactCheckStatus.Unreachable }),
			outcome("Unchecked build", { check: null }),
			outcome("Promised trailer", { withArtifact: false }),
			outcome("Tide states"),
			input("Sketches"),
			input("Moodboard"),
			input("Sound tests"),
		]);

		expect(carried.map((item) => item.text)).toEqual([
			"Playable slice",
			"Tide states",
			"Greybox level",
			"Design doc",
			"Sketches",
		]);
		expect(carried[0].artifact?.id).toBe("a-Playable slice");
	});
});

describe("getEntryPrefill", () => {
	it("returns the draft's own lines when it has some, carrying nothing over", async () => {
		db.projectCheckpoint.findFirst.mockResolvedValueOnce({
			id: "cp-draft",
			projectId: "p1",
			items: [{ text: "Saved line", artifact: null }],
		});

		await expect(getEntryPrefill("p1")).resolves.toEqual({
			items: [{ text: "Saved line", artifact: null }],
			carriedFrom: null,
		});
		expect(db.projectCheckpoint.findFirst).toHaveBeenCalledTimes(1);
	});

	it("carries over from the last closed checkpoint, naming its number", async () => {
		db.projectCheckpoint.findFirst
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce({
				projectId: "p1",
				createdAt: new Date("2026-08-01"),
				items: [input("Old input"), outcome("Delivered")],
			});
		checkpointNumber.mockResolvedValue(2);

		await expect(getEntryPrefill("p1")).resolves.toMatchObject({
			items: [{ text: "Delivered" }, { text: "Old input" }],
			carriedFrom: 2,
		});
		expect(db.projectCheckpoint.findFirst.mock.calls[1][0].where).toEqual({
			projectId: "p1",
			status: CheckpointStatus.Closed,
		});
	});

	it("is empty for a project with no history", async () => {
		db.projectCheckpoint.findFirst.mockResolvedValue(null);

		await expect(getEntryPrefill("p1")).resolves.toEqual({
			items: [],
			carriedFrom: null,
		});
	});
});

describe("getEntryStatus", () => {
	it("answers the hub in one shape, scoped to the user's founded projects", async () => {
		db.profile.findUnique.mockResolvedValue({ name: "Anna Petrova" });
		db.speciality.count.mockResolvedValue(1);
		db.project.findMany.mockResolvedValue([
			{
				id: "p1",
				slug: "lantern",
				name: "Lantern Keeper",
				coverImage: "https://cdn/cover.png",
				workflow: { currentStep: { name: "Ideation" } },
				checkpoints: [],
			},
			{
				id: "p2",
				slug: "tides",
				name: "Tides",
				coverImage: null,
				workflow: null,
				checkpoints: [{ id: "cp-run" }],
			},
		]);
		db.projectCheckpoint.findFirst.mockResolvedValue({
			id: "cp-draft",
			projectId: "p1",
			items: [{ text: "Greybox", artifact: null }],
		});
		db.projectCheckpoint.count.mockResolvedValue(1);

		await expect(getEntryStatus("u1")).resolves.toEqual({
			aboutDone: true,
			hadCheckpoint: true,
			projects: [
				{
					id: "p1",
					slug: "lantern",
					name: "Lantern Keeper",
					cover: "https://cdn/cover.png",
					stage: "Ideation",
					running: false,
				},
				{
					id: "p2",
					slug: "tides",
					name: "Tides",
					cover: null,
					stage: null,
					running: true,
				},
			],
			draft: {
				id: "cp-draft",
				projectId: "p1",
				items: [{ text: "Greybox", artifact: null }],
			},
		});

		const { where } = db.project.findMany.mock.calls[0][0];
		expect(where.team).toEqual({
			members: { some: { userId: "u1", status: "Founder" } },
		});
		expect(db.projectCheckpoint.findFirst.mock.calls[0][0].where).toMatchObject({
			projectId: { in: ["p1", "p2"] },
			status: CheckpointStatus.Draft,
		});
	});

	it("is not done about the user without a speciality, and has no draft without projects", async () => {
		db.profile.findUnique.mockResolvedValue({ name: "Anna" });
		db.speciality.count.mockResolvedValue(0);
		db.project.findMany.mockResolvedValue([]);

		await expect(getEntryStatus("u1")).resolves.toEqual({
			aboutDone: false,
			hadCheckpoint: false,
			projects: [],
			draft: null,
		});
		expect(db.projectCheckpoint.findFirst).not.toHaveBeenCalled();
	});
});

describe("PUT /api/checkpoint/entry/project", () => {
	const put = async (body: unknown) => {
		const { PUT } = await import("@/app/api/checkpoint/entry/project/route");
		const request = new NextRequest(
			"http://localhost/api/checkpoint/entry/project",
			{
				method: "PUT",
				body: JSON.stringify(body),
				headers: { "content-type": "application/json" },
			},
		);
		return (PUT as (r: NextRequest, c: unknown) => Promise<Response>)(request, {
			params: Promise.resolve({}),
		});
	};

	const valid = {
		projectId: "p1",
		items: [
			{ text: "  Greybox level  ", artifactId: "art-1" },
			{ text: "Design doc", artifactId: null },
		],
	};

	beforeEach(() => {
		db.teamMember.count.mockResolvedValue(1);
		db.projectArtifact.findMany.mockResolvedValue([{ id: "art-1" }]);
		getCreationBlocker.mockResolvedValue(null);
		db.profile.findUnique.mockResolvedValue(null);
		db.speciality.count.mockResolvedValue(0);
		db.project.findMany.mockResolvedValue([]);
	});

	it("refuses someone who is not the project's founder", async () => {
		db.teamMember.count.mockResolvedValue(0);

		expect((await put(valid)).status).toBe(403);
		expect(db.teamMember.count).toHaveBeenCalledWith({
			where: { userId: "u1", status: "Founder", team: { projectId: "p1" } },
		});
		expect(replaceCheckpointItems).not.toHaveBeenCalled();
	});

	it("refuses an artifact of another project", async () => {
		db.projectArtifact.findMany.mockResolvedValue([]);

		const response = await put(valid);

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({
			details: { artifactIds: ["art-1"] },
		});
		expect(db.projectArtifact.findMany).toHaveBeenCalledWith({
			where: { id: { in: ["art-1"] }, projectId: "p1" },
			select: { id: true },
		});
		expect(replaceCheckpointItems).not.toHaveBeenCalled();
	});

	it("refuses more than five lines, and none", async () => {
		const six = Array.from({ length: 6 }, (_, index) => ({
			text: `Line ${index}`,
			artifactId: null,
		}));

		expect((await put({ projectId: "p1", items: six })).status).toBe(400);
		expect((await put({ projectId: "p1", items: [] })).status).toBe(400);
		expect(
			(await put({ projectId: "p1", items: [{ text: "   ", artifactId: null }] }))
				.status,
		).toBe(400);
	});

	it("refuses with 409 while the project has a running checkpoint", async () => {
		getCreationBlocker.mockResolvedValue({
			reason: "checkpointOpen",
			checkpoint: { id: "cp-run" },
		});

		const response = await put(valid);

		expect(response.status).toBe(409);
		expect(await response.json()).toMatchObject({
			blocker: { reason: "checkpointOpen" },
		});
		expect(createDraftCheckpoint).not.toHaveBeenCalled();
		expect(replaceCheckpointItems).not.toHaveBeenCalled();
	});

	it("opens a draft and replaces its inputs with the trimmed lines", async () => {
		db.projectCheckpoint.findFirst.mockResolvedValue(null);
		createDraftCheckpoint.mockResolvedValue({ id: "cp-new" });

		const response = await put(valid);

		expect(response.status).toBe(200);
		expect(createDraftCheckpoint).toHaveBeenCalledWith("p1");
		expect(replaceCheckpointItems).toHaveBeenCalledWith(
			"cp-new",
			CheckpointItemKind.Input,
			[
				{ text: "Greybox level", artifactId: "art-1" },
				{ text: "Design doc", artifactId: null },
			],
		);
		expect(await response.json()).toMatchObject({ projects: [], draft: null });
	});

	it("reuses the draft and moves it with the project's stage", async () => {
		db.projectCheckpoint.findFirst.mockResolvedValue({
			id: "cp-draft",
			projectId: "p1",
			items: [],
		});
		ensureCheckpointStage.mockResolvedValue({ id: "step-ideation", name: "Ideation" });

		expect((await put(valid)).status).toBe(200);
		expect(createDraftCheckpoint).not.toHaveBeenCalled();
		expect(db.projectCheckpoint.update).toHaveBeenCalledWith({
			where: { id: "cp-draft" },
			data: expect.objectContaining({
				stepId: "step-ideation",
				stageName: "Ideation",
			}),
		});
		expect(replaceCheckpointItems).toHaveBeenCalledWith(
			"cp-draft",
			CheckpointItemKind.Input,
			expect.any(Array),
		);
	});
});
