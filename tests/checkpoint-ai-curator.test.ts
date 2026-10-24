import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	CheckpointCuratorKind,
	CheckpointSessionContentStatus,
	CheckpointStatus,
	CheckpointVerdict,
} from "@/config/prisma-enums";

const checkpointFindUnique = vi.fn();
const checkpointFindUniqueOrThrow = vi.fn();
const checkpointUpdate = vi.fn();
const sessionFindMany = vi.fn();
const sessionFindUniqueOrThrow = vi.fn();
const sessionUpdate = vi.fn();
const sessionUpdateMany = vi.fn();
const sessionCreateMany = vi.fn();
const writeSprintReview = vi.fn();
const writePlanAdvice = vi.fn();
const closeCheckpoint = vi.fn();
const notify = vi.fn();
const notifyVerdictSent = vi.fn();
const journalFindFirst = vi.fn();

vi.mock("@/services/prisma", () => ({
	prisma: {
		$transaction: vi.fn(async (ops: unknown[]) => ops),
		projectCheckpoint: {
			findUnique: (...a: unknown[]) => checkpointFindUnique(...a),
			findUniqueOrThrow: (...a: unknown[]) => checkpointFindUniqueOrThrow(...a),
			update: (...a: unknown[]) => checkpointUpdate(...a),
		},
		checkpointSession: {
			findMany: (...a: unknown[]) => sessionFindMany(...a),
			findUniqueOrThrow: (...a: unknown[]) => sessionFindUniqueOrThrow(...a),
			update: (...a: unknown[]) => sessionUpdate(...a),
			updateMany: (...a: unknown[]) => sessionUpdateMany(...a),
			deleteMany: vi.fn(),
			createMany: (...a: unknown[]) => sessionCreateMany(...a),
		},
		checkpointJournalEntry: {
			findFirst: (...a: unknown[]) => journalFindFirst(...a),
		},
		projectReport: { findMany: vi.fn(async () => [{ content: "Devlog" }]) },
		projectArtifact: { findMany: vi.fn(async () => []) },
	},
}));
vi.mock("@/repositories/evidence-seen", () => ({
	seeCheckpointEvidence: vi.fn(async () => {}),
	devlogMediaLines: vi.fn(async () => []),
}));
vi.mock("@/repositories/curator-journal", () => ({ journal: vi.fn() }));
vi.mock("@/repositories/curator-context", () => ({
	projectPicture: vi.fn(async () => "The project picture."),
	runPeriod: vi.fn(() => ({ from: new Date(0), to: new Date(0) })),
}));
vi.mock("@/services/curator-review", () => ({
	writeSprintReview: (...a: unknown[]) => writeSprintReview(...a),
	writePlanAdvice: (...a: unknown[]) => writePlanAdvice(...a),
}));
vi.mock("@/repositories/checkpoint-curator.repository", () => ({
	closeCheckpoint: (...a: unknown[]) => closeCheckpoint(...a),
}));
vi.mock("@/services/checkpoint-notifications", () => ({
	appUrl: () => "https://gdhub.test",
	notify: (...a: unknown[]) => notify(...a),
	recipient: { select: { id: true, email: true } },
	reviewUrl: (slug: string, number: number, index: number) =>
		`https://gdhub.test/user/project/${slug}/workflow/cp${number}/review/${index}`,
}));
vi.mock("@/services/checkpoint-verdict-notifications", () => ({
	notifyVerdictSent: (...a: unknown[]) => notifyVerdictSent(...a),
}));
vi.mock("@/repositories/checkpoint-number", () => ({
	checkpointNumber: vi.fn(async () => 3),
}));
vi.mock("@/services/stripe/server", () => ({}));

const { startAiCheckpoint } = await import("@/repositories/checkpoint-payment");
const { adviseOnPlan, writeBriefFor, writeDueBriefs, writeDueReviews } =
	await import("@/repositories/checkpoint-review");
const { journal } = await import("@/repositories/curator-journal");

// Started Thursday 1 Oct: sprint 1 is 1–7 Oct, its review on day 8.
const startedAt = new Date("2026-10-01T00:00:00Z");
const person = (id: string) => ({ id, email: `${id}@x.test` });

beforeEach(() => vi.clearAllMocks());

describe("startAiCheckpoint", () => {
	it("starts today when the day picked passed before the payment", async () => {
		checkpointFindUniqueOrThrow.mockResolvedValue({ startedAt });
		const now = new Date("2026-10-04T15:00:00Z");
		await startAiCheckpoint("cp", "pay", now);

		const data = checkpointUpdate.mock.calls[0][0].data;
		expect(data).toMatchObject({
			status: CheckpointStatus.Active,
			paymentId: "pay",
			startedAt: new Date("2026-10-04T00:00:00Z"),
			dueAt: new Date("2026-10-31T00:00:00Z"),
			goalAgreedAt: now,
			goalAgreedById: null,
		});
		expect(
			sessionCreateMany.mock.calls[0][0].data.map(
				(row: { index: number; scheduledAt: Date }) => [
					row.index,
					row.scheduledAt.toISOString().slice(0, 10),
				],
			),
		).toEqual([
			[1, "2026-10-04"],
			[2, "2026-10-11"],
			[3, "2026-10-18"],
			[4, "2026-10-25"],
			[5, "2026-11-01"],
		]);
	});

	it("keeps a day still ahead", async () => {
		checkpointFindUniqueOrThrow.mockResolvedValue({ startedAt });
		await startAiCheckpoint("cp", "pay", new Date("2026-09-29T10:00:00Z"));
		expect(checkpointUpdate.mock.calls[0][0].data.startedAt).toEqual(startedAt);
	});
});

const items = [
	{ id: "t1", text: "Loop", cut: false, originalText: null, addedAt: null, artifact: null },
	{
		id: "t2",
		text: "One-pager",
		cut: false,
		originalText: null,
		addedAt: null,
		artifact: { id: "a", type: "Document", name: "Doc", link: "x", checkStatus: "Readable" },
	},
];

const reviewed = (index: number, overrides: Record<string, unknown> = {}) => ({
	id: "cp",
	projectId: "p",
	createdAt: new Date(),
	goal: "A greybox",
	stageName: "Concepting",
	startedAt,
	verdict: null,
	verdictNote: null,
	items,
	sessions: [{ index: index - 1, content: null }],
	pulses: [
		{ week: index - 1, confirmedAt: new Date() },
		{ week: index - 1, confirmedAt: null },
	],
	project: {
		name: "Hollow Tide",
		slug: "hollow-tide",
		author: person("author"),
		team: { members: [{ user: person("author") }, { user: person("oleg") }] },
	},
	...overrides,
});

const review = {
	message: "Good start.",
	notes: {
		inShort: "Done.",
		discussed: [
			{ itemId: "t1", text: "Shown." },
			{ itemId: "made-up", text: "?" },
		],
		notDiscussed: ["made-up"],
		outsidePlan: [],
		agreed: [{ text: "Test it", itemId: "made-up", dueDay: null }],
		questions: [],
	},
};

describe("writeDueReviews", () => {
	beforeEach(() => {
		sessionFindMany.mockResolvedValue([{ id: "s2" }]);
		sessionUpdateMany.mockResolvedValue({ count: 1 });
		writeSprintReview.mockResolvedValue(review);
	});

	it("takes the AI's review days that have come, sprints while running and the final once over", async () => {
		const now = new Date("2026-10-08T01:00:00Z");
		sessionFindMany.mockResolvedValue([]);
		await writeDueReviews(now);
		expect(sessionFindMany.mock.calls[0][0].where).toEqual({
			contentStatus: null,
			scheduledAt: { lte: now },
			OR: [
				{
					index: { gt: 1, lt: 5 },
					checkpoint: {
						curatorKind: CheckpointCuratorKind.AI,
						status: CheckpointStatus.Active,
					},
				},
				{
					index: 5,
					checkpoint: {
						curatorKind: CheckpointCuratorKind.AI,
						status: { in: [CheckpointStatus.Review, CheckpointStatus.Closed] },
					},
				},
			],
		});
	});

	it("leaves a session another run claimed", async () => {
		sessionUpdateMany.mockResolvedValue({ count: 0 });
		expect(await writeDueReviews()).toBe(0);
		expect(writeSprintReview).not.toHaveBeenCalled();
	});

	it("reviews the sprint behind, drops made-up ids and tells the team once each", async () => {
		sessionFindUniqueOrThrow.mockResolvedValue({ index: 2, checkpointId: "cp" });
		checkpointFindUniqueOrThrow.mockResolvedValue(reviewed(2));
		const now = new Date("2026-10-08T01:00:00Z");
		expect(await writeDueReviews(now)).toBe(1);

		const input = writeSprintReview.mock.calls[0][0];
		expect(input.sprint).toBe(1);
		expect(input.pulse).toEqual({ worked: 1, missing: 1 });
		expect(writePlanAdvice).not.toHaveBeenCalled();
		expect(closeCheckpoint).not.toHaveBeenCalled();

		const data = sessionUpdate.mock.calls[0][0].data;
		expect(data.contentStatus).toBe(CheckpointSessionContentStatus.Ready);
		expect(data.endedAt).toBe(now);
		expect(data.content.message).toBe("Good start.");
		expect(data.content.notes.discussed).toEqual([{ itemId: "t1", text: "Shown." }]);
		expect(data.content.notes.notDiscussed).toEqual([]);
		expect(data.content.notes.agreed[0].itemId).toBeNull();

		const letters = notify.mock.calls.map(([to, id, payload]) => [
			to.id,
			id,
			payload.redirectUrl,
		]);
		expect(letters).toEqual([
			[
				"author",
				"cp-review-s2-author",
				"https://gdhub.test/user/project/hollow-tide/workflow/cp3/review/2",
			],
			[
				"oleg",
				"cp-review-s2-oleg",
				"https://gdhub.test/user/project/hollow-tide/workflow/cp3/review/2",
			],
		]);
	});

	it("adds the advice on the tasks to the sprint 2 review, on open tasks only", async () => {
		sessionFindUniqueOrThrow.mockResolvedValue({ index: 3, checkpointId: "cp" });
		checkpointFindUniqueOrThrow.mockResolvedValue(reviewed(3));
		writePlanAdvice.mockResolvedValue({
			message: "Halfway.",
			tasks: [
				{ itemId: "t1", kind: "shorten", note: "Too big.", suggestion: "Small loop" },
				{ itemId: "t2", kind: "cut", note: "Done already.", suggestion: null },
			],
			add: ["Playtest"],
		});
		await writeDueReviews();

		expect(writePlanAdvice.mock.calls[0][0]).toMatchObject({
			moment: "midway",
			review: "Done.",
		});
		const { advice } = sessionUpdate.mock.calls[0][0].data.content;
		expect(advice.tasks.map((row: { itemId: string }) => row.itemId)).toEqual(["t1"]);
		expect(advice.add).toEqual(["Playtest"]);
		expect(advice.hash).toMatch(/^[0-9a-f]{64}$/);
	});

	it("settles the verdict before the final review and tells the author of it", async () => {
		sessionFindUniqueOrThrow.mockResolvedValue({ index: 5, checkpointId: "cp" });
		checkpointFindUniqueOrThrow.mockResolvedValue(
			reviewed(5, {
				verdict: CheckpointVerdict.StageClosed,
				verdictNote: "All proven.",
			}),
		);
		await writeDueReviews();

		expect(closeCheckpoint).toHaveBeenCalledWith("cp");
		expect(closeCheckpoint.mock.invocationCallOrder[0]).toBeLessThan(
			writeSprintReview.mock.invocationCallOrder[0],
		);
		expect(writeSprintReview.mock.calls[0][0].verdict).toEqual({
			verdict: CheckpointVerdict.StageClosed,
			note: "All proven.",
		});
		expect(notifyVerdictSent).toHaveBeenCalledWith("cp");
		expect(notify).not.toHaveBeenCalled();
	});

	it("hands the final back when no verdict could be settled", async () => {
		sessionFindUniqueOrThrow.mockResolvedValue({ index: 5, checkpointId: "cp" });
		checkpointFindUniqueOrThrow.mockResolvedValue(reviewed(5));
		expect(await writeDueReviews()).toBe(0);
		expect(writeSprintReview).not.toHaveBeenCalled();
		expect(sessionUpdate).toHaveBeenCalledWith({
			where: { id: "s2" },
			data: { contentStatus: null },
		});
	});

	it("hands the session back when the model gives nothing", async () => {
		sessionFindUniqueOrThrow.mockResolvedValue({ index: 2, checkpointId: "cp" });
		checkpointFindUniqueOrThrow.mockResolvedValue(reviewed(2));
		writeSprintReview.mockResolvedValue(null);
		expect(await writeDueReviews()).toBe(0);
		expect(sessionUpdate).toHaveBeenCalledWith({
			where: { id: "s2" },
			data: { contentStatus: null },
		});
		expect(notify).not.toHaveBeenCalled();
	});
});

describe("adviseOnPlan", () => {
	const onDay1 = new Date("2026-10-01T10:00:00Z");
	const plan = (content: unknown = null) => ({
		curatorId: null,
		curatorKind: CheckpointCuratorKind.AI,
		goal: "A greybox",
		goalAgreedAt: startedAt,
		stageName: "Concepting",
		startedAt,
		project: { authorId: "author" },
		sessions: [
			{ id: "s1", index: 1, scheduledAt: startedAt, endedAt: null, content },
		],
		items,
	});
	const advice = {
		message: "Hi.",
		tasks: [{ itemId: "t1", kind: "vague", note: "Unclear.", suggestion: "Loop clip" }],
		add: [],
	};

	it("lets only the author ask", async () => {
		checkpointFindUnique.mockResolvedValue(plan());
		expect(await adviseOnPlan("cp", "oleg", onDay1)).toBe("forbidden");
		expect(writePlanAdvice).not.toHaveBeenCalled();
	});

	it("writes the start's letter and advice on session 1", async () => {
		checkpointFindUnique.mockResolvedValue(plan());
		writePlanAdvice.mockResolvedValue(advice);
		expect(await adviseOnPlan("cp", "author", onDay1)).toBeNull();
		expect(writePlanAdvice.mock.calls[0][0].moment).toBe("start");
		const { where, data } = sessionUpdate.mock.calls[0][0];
		expect(where).toEqual({ id: "s1" });
		expect(data.content.message).toBe("Hi.");
		expect(data.content.notes).toBeNull();
		expect(data.content.advice.tasks).toHaveLength(1);
	});

	it("does not read the same plan twice", async () => {
		checkpointFindUnique.mockResolvedValue(plan());
		writePlanAdvice.mockResolvedValue(advice);
		await adviseOnPlan("cp", "author", onDay1);
		const saved = sessionUpdate.mock.calls[0][0].data.content;

		vi.clearAllMocks();
		checkpointFindUnique.mockResolvedValue(plan(saved));
		expect(await adviseOnPlan("cp", "author", onDay1)).toBeNull();
		expect(writePlanAdvice).not.toHaveBeenCalled();
	});

	it("reads a pro checkpoint's draft before call 1, leaving the session to its notes", async () => {
		const call1 = new Date("2026-10-01T14:00:00Z");
		checkpointFindUnique.mockResolvedValue({
			...plan(),
			curatorId: "patrick",
			curatorKind: CheckpointCuratorKind.Human,
			goalAgreedAt: null,
			sessions: [{ id: "s1", index: 1, scheduledAt: call1, endedAt: null, content: null }],
		});
		writePlanAdvice.mockResolvedValue(advice);
		expect(await adviseOnPlan("cp", "author", onDay1)).toBeNull();
		const { data } = sessionUpdate.mock.calls[0][0];
		expect(data.content.advice.tasks).toHaveLength(1);
		expect(data).not.toHaveProperty("contentStatus");

		vi.clearAllMocks();
		expect(
			await adviseOnPlan("cp", "author", new Date("2026-10-01T14:05:00Z")),
		).toBe("planClosed");
		expect(writePlanAdvice).not.toHaveBeenCalled();
	});

	it("refuses once the plan is closed", async () => {
		checkpointFindUnique.mockResolvedValue(plan());
		expect(
			await adviseOnPlan("cp", "author", new Date("2026-10-10T10:00:00Z")),
		).toBe("planClosed");
	});
});

describe("the human curator's brief", () => {
	it("is written for human calls 2–5 starting within the next 24 hours", async () => {
		sessionFindMany.mockResolvedValue([]);
		const now = new Date("2026-10-08T01:00:00Z");
		await writeDueBriefs(now);

		const { where } = sessionFindMany.mock.calls[0][0];
		expect(where).toMatchObject({
			index: { gt: 1 },
			endedAt: null,
			scheduledAt: { gt: now, lte: new Date("2026-10-09T01:00:00Z") },
			checkpoint: { curatorKind: CheckpointCuratorKind.Human },
		});
	});

	it("reads the sprint and the last call's agreed focus, for the curator alone", async () => {
		sessionFindUniqueOrThrow.mockResolvedValue({ index: 3, checkpointId: "cp" });
		journalFindFirst.mockResolvedValue(null);
		checkpointFindUniqueOrThrow.mockResolvedValue(
			reviewed(3, {
				sessions: [
					{
						index: 2,
						content: {
							inShort: "Call 2.",
							agreed: [{ text: "Fix the tide timer", itemId: null, dueDay: null }],
						},
					},
				],
			}),
		);
		writeSprintReview.mockResolvedValue(review);

		await expect(writeBriefFor("s3")).resolves.toBe(true);

		const [input, meter] = writeSprintReview.mock.calls[0];
		expect(input.sprint).toBe(2);
		expect(input.focusLastReview).toEqual(["Fix the tide timer"]);
		expect(meter).toEqual({ checkpointId: "cp", purpose: "callBrief" });
		const entry = vi.mocked(journal).mock.calls[0][0];
		expect(entry).toMatchObject({ kind: "Review", sprint: 2 });
		expect(
			(entry.output as { notes: typeof review.notes }).notes.discussed,
		).toEqual([{ itemId: "t1", text: "Shown." }]);
		expect(notify).not.toHaveBeenCalled();
	});

	it("is written once per call", async () => {
		sessionFindUniqueOrThrow.mockResolvedValue({ index: 3, checkpointId: "cp" });
		journalFindFirst.mockResolvedValue({ id: "e1" });

		await expect(writeBriefFor("s3")).resolves.toBe(false);
		expect(writeSprintReview).not.toHaveBeenCalled();
	});
});
