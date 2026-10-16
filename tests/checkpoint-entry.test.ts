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
const ensureCheckpointStage = vi.fn();
const checkpointNumber = vi.fn();
const limitAiCalls = vi.fn();
const validate = vi.fn();
const joinSpace = vi.fn();

const db = {
	teamMember: { count: vi.fn() },
	projectArtifact: { findMany: vi.fn() },
	projectCheckpoint: {
		findFirst: vi.fn(),
		update: vi.fn(),
		count: vi.fn(),
		create: vi.fn(),
	},
	checkpointItem: { deleteMany: vi.fn(), createMany: vi.fn() },
	profile: { findUnique: vi.fn(), upsert: vi.fn() },
	speciality: {
		count: vi.fn(),
		findFirst: vi.fn(),
		update: vi.fn(),
		create: vi.fn(),
	},
	project: { findMany: vi.fn() },
	user: { findUnique: vi.fn(), update: vi.fn() },
	workDirection: { findUnique: vi.fn() },
	payment: { findMany: vi.fn() },
	$executeRaw: vi.fn(),
	$transaction: vi.fn(),
};

vi.mock("@/auth", () => ({ auth: () => authMock() }));
vi.mock("@/services/prisma", () => ({ prisma: db }));
vi.mock("@/repositories/checkpoint.repository", () => ({
	getCreationBlocker: (...args: unknown[]) => getCreationBlocker(...args),
	toArtifactRef: <T>(artifact: T) => artifact,
}));
vi.mock("@/lib/rate-limit", () => ({
	limitAiCalls: (...args: unknown[]) => limitAiCalls(...args),
}));
vi.mock("@/services/ai-validation", () => ({
	aiValidation: { validate: (...args: unknown[]) => validate(...args) },
}));
vi.mock("@/services/access/membership", () => ({
	joinSpace: (...args: unknown[]) => joinSpace(...args),
}));
vi.mock("@/services/brevo/sync", () => ({ syncUserToBrevo: vi.fn() }));
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
	db.$transaction.mockImplementation(async (fn: (tx: typeof db) => unknown) =>
		fn(db),
	);
	db.user.findUnique.mockResolvedValue(null);
	db.payment.findMany.mockResolvedValue([]);
	limitAiCalls.mockResolvedValue(null);
	process.env.CHECKPOINTS_PURCHASE_OPEN = "true";
});

/** The draft lookup and the "on its way" lookup share `findFirst`. */
const findFirstBy = ({
	current = null,
	draft = null,
}: {
	current?: unknown;
	draft?: unknown;
}) =>
	db.projectCheckpoint.findFirst.mockImplementation(
		async ({ where }: { where: { status: unknown } }) =>
			where.status === CheckpointStatus.Draft ? draft : current,
	);

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
	const lantern = {
		id: "p1",
		slug: "lantern",
		name: "Lantern Keeper",
		coverImage: "https://cdn/cover.png",
		workflow: { currentStep: { name: "Ideation" } },
		checkpoints: [],
	};
	const tides = {
		id: "p2",
		slug: "tides",
		name: "Tides",
		coverImage: null,
		workflow: null,
		checkpoints: [{ id: "cp-run" }],
	};

	it("answers the hub in one shape, scoped to the user's founded projects", async () => {
		db.user.findUnique.mockResolvedValue({
			agreements: { agreeWithTermsAndPrivacy: true },
		});
		db.profile.findUnique.mockResolvedValue({ name: "Anna Petrova" });
		db.speciality.count.mockResolvedValue(1);
		db.project.findMany.mockResolvedValue([lantern, tides]);
		db.payment.findMany.mockResolvedValue([{ payableId: "cp-old" }]);
		db.projectCheckpoint.count.mockResolvedValue(1);
		findFirstBy({
			current: {
				id: "cp-run",
				status: CheckpointStatus.Active,
				projectId: "p2",
				createdAt: new Date("2026-10-01"),
				project: { slug: "tides", name: "Tides" },
			},
			draft: {
				id: "cp-draft",
				projectId: "p1",
				items: [{ text: "Greybox", artifact: null }],
			},
		});
		checkpointNumber.mockResolvedValue(3);

		await expect(getEntryStatus("u1")).resolves.toEqual({
			aboutDone: true,
			hadCheckpoint: true,
			purchaseOpen: true,
			termsAccepted: true,
			current: {
				id: "cp-run",
				number: 3,
				projectSlug: "tides",
				projectName: "Tides",
				status: CheckpointStatus.Active,
			},
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
		const draftWhere = db.projectCheckpoint.findFirst.mock.calls
			.map(([args]) => args.where)
			.find((w) => w.status === CheckpointStatus.Draft);
		// The project already on its way needs no draft.
		expect(draftWhere.projectId).toEqual({ in: ["p1"] });
		const currentWhere = db.projectCheckpoint.findFirst.mock.calls
			.map(([args]) => args.where)
			.find((w) => w.status !== CheckpointStatus.Draft);
		expect(currentWhere).toEqual({
			status: {
				in: [
					CheckpointStatus.AwaitingCurator,
					CheckpointStatus.Active,
					CheckpointStatus.Review,
				],
			},
			project: {
				team: { members: { some: { userId: "u1", status: "Founder" } } },
			},
		});
	});

	it("counts a paid checkpoint of any non-Draft status, by the user's own payments", async () => {
		db.profile.findUnique.mockResolvedValue(null);
		db.speciality.count.mockResolvedValue(0);
		db.project.findMany.mockResolvedValue([]);
		db.payment.findMany.mockResolvedValue([
			{ payableId: "cp-a" },
			{ payableId: "cp-b" },
		]);
		db.projectCheckpoint.count.mockResolvedValue(1);
		findFirstBy({});

		await expect(getEntryStatus("u1")).resolves.toMatchObject({
			hadCheckpoint: true,
		});
		expect(db.payment.findMany.mock.calls[0][0].where).toEqual({
			payerId: "u1",
			payableType: "CHECKPOINT",
			status: {
				in: [
					"PROCESSING",
					"COMPLETED",
					"REFUNDED",
					"PARTIALLY_REFUNDED",
					"DISPUTED",
				],
			},
		});
		expect(db.projectCheckpoint.count.mock.calls[0][0].where).toEqual({
			id: { in: ["cp-a", "cp-b"] },
			status: { not: CheckpointStatus.Draft },
		});
	});

	it("has not had one when the only paid checkpoint went back to Draft", async () => {
		db.profile.findUnique.mockResolvedValue(null);
		db.speciality.count.mockResolvedValue(0);
		db.project.findMany.mockResolvedValue([]);
		db.payment.findMany.mockResolvedValue([{ payableId: "cp-declined" }]);
		db.projectCheckpoint.count.mockResolvedValue(0);
		findFirstBy({});

		await expect(getEntryStatus("u1")).resolves.toMatchObject({
			hadCheckpoint: false,
		});
	});

	it("is not done about the user without a speciality, and has no draft without projects", async () => {
		db.user.findUnique.mockResolvedValue({
			agreements: { agreeWithTermsAndPrivacy: false },
		});
		db.profile.findUnique.mockResolvedValue({ name: "Anna" });
		db.speciality.count.mockResolvedValue(0);
		db.project.findMany.mockResolvedValue([]);
		findFirstBy({});
		process.env.CHECKPOINTS_PURCHASE_OPEN = "false";

		await expect(getEntryStatus("u1")).resolves.toEqual({
			aboutDone: false,
			hadCheckpoint: false,
			purchaseOpen: false,
			termsAccepted: false,
			current: null,
			projects: [],
			draft: null,
		});
		expect(
			db.projectCheckpoint.findFirst.mock.calls.some(
				([args]) => args.where.status === CheckpointStatus.Draft,
			),
		).toBe(false);
	});
});

describe("termsAccepted", () => {
	it("is true only for a recorded agreement", async () => {
		const { termsAccepted } = await import("@/repositories/checkpoint-entry");

		expect(termsAccepted({ agreeWithTermsAndPrivacy: true })).toBe(true);
		expect(termsAccepted({ agreeWithTermsAndPrivacy: false })).toBe(false);
		expect(termsAccepted({ agreeWithTermsAndPrivacy: "true" })).toBe(false);
		expect(termsAccepted(null)).toBe(false);
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
		ensureCheckpointStage.mockResolvedValue({
			id: "step-ideation",
			name: "Ideation",
		});
	});

	it("refuses someone who is not the project's founder", async () => {
		db.teamMember.count.mockResolvedValue(0);

		expect((await put(valid)).status).toBe(403);
		expect(db.teamMember.count).toHaveBeenCalledWith({
			where: { userId: "u1", status: "Founder", team: { projectId: "p1" } },
		});
		expect(db.checkpointItem.createMany).not.toHaveBeenCalled();
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
		expect(db.checkpointItem.createMany).not.toHaveBeenCalled();
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

	it.each([
		["checkpointOpen", { reason: "checkpointOpen", checkpoint: { id: "cp-run" } }],
		["purchaseClosed", { reason: "purchaseClosed" }],
		["noStage", { reason: "noStage" }],
	])("refuses with 409 naming the blocker: %s", async (reason, blocker) => {
		getCreationBlocker.mockResolvedValue(blocker);

		const response = await put(valid);

		expect(response.status).toBe(409);
		expect(await response.json()).toMatchObject({
			error: reason,
			blocker: { reason },
		});
		expect(db.projectCheckpoint.create).not.toHaveBeenCalled();
		expect(db.checkpointItem.createMany).not.toHaveBeenCalled();
	});

	it("opens a draft under the project's lock and writes the trimmed lines", async () => {
		db.projectCheckpoint.findFirst.mockResolvedValue(null);
		db.projectCheckpoint.count.mockResolvedValue(2);
		db.projectCheckpoint.create.mockResolvedValue({ id: "cp-new" });

		const response = await put(valid);

		expect(response.status).toBe(200);
		expect(db.$executeRaw).toHaveBeenCalledTimes(1);
		expect(db.$executeRaw.mock.calls[0].slice(1)).toEqual([
			"checkpoint-draft:p1",
		]);
		expect(db.projectCheckpoint.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				projectId: "p1",
				stepId: "step-ideation",
				stageName: "Ideation",
				order: 3,
				status: CheckpointStatus.Draft,
			}),
			select: { id: true },
		});
		expect(db.checkpointItem.deleteMany).toHaveBeenCalledWith({
			where: { checkpointId: "cp-new", kind: CheckpointItemKind.Input },
		});
		expect(db.checkpointItem.createMany).toHaveBeenCalledWith({
			data: [
				{
					checkpointId: "cp-new",
					kind: CheckpointItemKind.Input,
					order: 1,
					text: "Greybox level",
					artifactId: "art-1",
				},
				{
					checkpointId: "cp-new",
					kind: CheckpointItemKind.Input,
					order: 2,
					text: "Design doc",
					artifactId: null,
				},
			],
		});
		expect(await response.json()).toMatchObject({ projects: [], draft: null });
	});

	it("reuses the draft found under the lock and moves it with the project's stage", async () => {
		findFirstBy({ draft: { id: "cp-draft" } });

		expect((await put(valid)).status).toBe(200);
		expect(db.projectCheckpoint.create).not.toHaveBeenCalled();
		expect(db.projectCheckpoint.update).toHaveBeenCalledWith({
			where: { id: "cp-draft" },
			data: expect.objectContaining({
				stepId: "step-ideation",
				stageName: "Ideation",
			}),
		});
		expect(db.checkpointItem.deleteMany).toHaveBeenCalledWith({
			where: { checkpointId: "cp-draft", kind: CheckpointItemKind.Input },
		});
	});
});

describe("POST /api/checkpoint/entry/about", () => {
	const post = async (body: unknown) => {
		const { POST } = await import("@/app/api/checkpoint/entry/about/route");
		const request = new NextRequest(
			"http://localhost/api/checkpoint/entry/about",
			{
				method: "POST",
				body: JSON.stringify(body),
				headers: { "content-type": "application/json" },
			},
		);
		return (POST as (r: NextRequest, c: unknown) => Promise<Response>)(request, {
			params: Promise.resolve({}),
		});
	};

	const valid = {
		name: "Anna Petrova",
		country: "PL",
		specialityName: "Level designer",
		workDirectionId: "wd-1",
		level: "Skillful",
	};

	beforeEach(() => {
		db.workDirection.findUnique.mockResolvedValue({ id: "wd-1" });
		validate.mockResolvedValue({ ok: true });
	});

	it("refuses to finish onboarding without a recorded or ticked agreement", async () => {
		db.user.findUnique.mockResolvedValue({
			onboardingDone: false,
			agreements: { agreeWithTermsAndPrivacy: false },
		});

		for (const agree of [undefined, false]) {
			const response = await post({ ...valid, agreeWithTermsAndPrivacy: agree });
			expect(response.status).toBe(400);
			expect(await response.json()).toMatchObject({ error: "termsRequired" });
		}
		expect(validate).not.toHaveBeenCalled();
		expect(db.user.update).not.toHaveBeenCalled();
	});

	it("records the agreement ticked here and sets Author on a first profile", async () => {
		db.user.findUnique.mockResolvedValue({ onboardingDone: false, agreements: null });

		const response = await post({ ...valid, agreeWithTermsAndPrivacy: true });

		expect(response.status).toBe(200);
		expect(db.user.update.mock.calls[0][0].data).toMatchObject({
			agreements: { agreeWithTermsAndPrivacy: true },
			onboardingDone: true,
		});
		const upsert = db.profile.upsert.mock.calls[0][0];
		expect(upsert.create.primaryInterest).toBe("Author");
		expect(upsert.update.primaryInterest).toBe("Author");
	});

	it("leaves an onboarded user's interest and agreement alone", async () => {
		db.user.findUnique.mockResolvedValue({
			onboardingDone: true,
			agreements: { agreeWithTermsAndPrivacy: true },
		});

		const response = await post({ ...valid, agreeWithTermsAndPrivacy: false });

		expect(response.status).toBe(200);
		expect(db.profile.upsert.mock.calls[0][0].update).not.toHaveProperty(
			"primaryInterest",
		);
		expect(db.user.update.mock.calls[0][0].data.agreements).toEqual({
			agreeWithTermsAndPrivacy: true,
		});
	});

	it("answers 429 before the AI is asked when the user is over the limit", async () => {
		db.user.findUnique.mockResolvedValue({
			onboardingDone: true,
			agreements: { agreeWithTermsAndPrivacy: true },
		});
		limitAiCalls.mockResolvedValue(
			new Response(JSON.stringify({ error: "rateLimited", retryAfter: 42 }), {
				status: 429,
			}),
		);

		const response = await post(valid);

		expect(response.status).toBe(429);
		expect(limitAiCalls).toHaveBeenCalledWith("entry-about", "u1");
		expect(validate).not.toHaveBeenCalled();
	});
});
