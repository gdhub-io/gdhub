import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	CheckpointCuratorKind,
	CheckpointSessionContentStatus,
	CheckpointStatus,
	CheckpointVerdict,
} from "@/config/prisma-enums";

vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://gdhub.test");

const checkpointFindUnique = vi.fn();
const checkpointFindMany = vi.fn(async (..._a: unknown[]) => [] as unknown[]);
const checkpointFindUniqueOrThrow = vi.fn();
const checkpointUpdate = vi.fn();
const checkpointUpdateMany = vi.fn();
const sessionDeleteMany = vi.fn();
const sessionFindMany = vi.fn();
const sessionFindUniqueOrThrow = vi.fn();
const sessionUpdate = vi.fn();
const sessionUpdateMany = vi.fn();
const sessionCreateMany = vi.fn();
const writeSprintReview = vi.fn();
const writePlanAdvice = vi.fn();
const reviewSprint = vi.fn();
const closeCheckpoint = vi.fn();
const notify = vi.fn();
const writeFirstLetter = vi.fn();
const notifyPlanChecked = vi.fn();
const notifyVerdictSent = vi.fn();
const journalFindFirst = vi.fn();

vi.mock("@/services/prisma", () => {
	const prisma = {
		$transaction: vi.fn(async (ops: unknown) =>
			typeof ops === "function" ? ops(prisma) : ops,
		),
		projectCheckpoint: {
			findUnique: (...a: unknown[]) => checkpointFindUnique(...a),
			findMany: (...a: unknown[]) => checkpointFindMany(...a),
			findUniqueOrThrow: (...a: unknown[]) => checkpointFindUniqueOrThrow(...a),
			update: (...a: unknown[]) => checkpointUpdate(...a),
			updateMany: (...a: unknown[]) => checkpointUpdateMany(...a),
		},
		checkpointSession: {
			findMany: (...a: unknown[]) => sessionFindMany(...a),
			findUniqueOrThrow: (...a: unknown[]) => sessionFindUniqueOrThrow(...a),
			update: (...a: unknown[]) => sessionUpdate(...a),
			updateMany: (...a: unknown[]) => sessionUpdateMany(...a),
			deleteMany: (...a: unknown[]) => sessionDeleteMany(...a),
			createMany: (...a: unknown[]) => sessionCreateMany(...a),
		},
		checkpointJournalEntry: {
			findFirst: (...a: unknown[]) => journalFindFirst(...a),
		},
		projectReport: { findMany: vi.fn(async () => [{ content: "Devlog" }]) },
		projectArtifact: { findMany: vi.fn(async () => []) },
	};
	return { prisma };
});
vi.mock("@/services/checkpoints/flows/evidence-seen", () => ({
	lookedArtifactLines: vi.fn(async () => []),
	seeInputArtifacts: vi.fn(async () => {}),
	seeCheckpointEvidence: vi.fn(async () => {}),
	devlogMediaLines: vi.fn(async () => []),
	sprintArtifactLines: vi.fn(async () => [
		'GameplayVideo "Sprint 1 build" https://x.test/v: one tide loop played through',
	]),
}));
vi.mock("@/repositories/checkpoints/journal", () => ({ journal: vi.fn() }));
vi.mock("@/repositories/checkpoints/picture", () => ({
	picturesOf: async () => new Map(),
	takePicture: vi.fn(),
	runChangeOf: async () => ({ directions: [], difference: null }),
}));
vi.mock("@/repositories/checkpoints/ai-curator-context", async (actual) => ({
	memberRole: (await actual<typeof import("@/repositories/checkpoints/ai-curator-context")>())
		.memberRole,
	curatorPersona: vi.fn(async () => ({ genres: [], settings: [], levels: [] })),
	runPeriod: vi.fn(() => ({ from: new Date(0), to: new Date(0) })),
	checkpointFacts: vi.fn(async (checkpoint: { stageName: string }) => ({
		workflow: {
			currentStage: checkpoint.stageName,
			nextStage: null,
			description: null,
			requiredTasks: [],
		},
		team: {
			members: 2,
			stated: 0,
			hoursPerWeek: null,
			hoursPerRun: null,
			people: [
				{ name: "A", role: "Game designer", level: null, hoursPerWeek: null, weeks: [true] },
				{ name: "B", role: "Lead artist", level: null, hoursPerWeek: null, weeks: [false] },
			],
		},
		picture: "The project picture.",
		marketing: { devlogs: [], links: [] },
	})),
}));
vi.mock("@/services/checkpoints/ai-review", async (original) => ({
	midwayAdviceInput: (
		await original<typeof import("@/services/checkpoints/ai-review")>()
	).midwayAdviceInput,
	writeSprintReview: (...a: unknown[]) => writeSprintReview(...a),
	writePlanAdvice: (...a: unknown[]) => writePlanAdvice(...a),
	reviewSprint: (...a: unknown[]) => reviewSprint(...a),
}));
vi.mock("@/services/checkpoints/flows/ai-curator", () => ({
	closeCheckpoint: (...a: unknown[]) => closeCheckpoint(...a),
	writeFirstLetter: (...a: unknown[]) => writeFirstLetter(...a),
}));
vi.mock("@/services/checkpoints/notifications", () => ({
	notify: (...a: unknown[]) => notify(...a),
	notifyPlanChecked: (...a: unknown[]) => notifyPlanChecked(...a),
}));
vi.mock("@/services/checkpoints/verdict-notifications", () => ({
	notifyVerdictSent: (...a: unknown[]) => notifyVerdictSent(...a),
}));
vi.mock("@/repositories/checkpoints/number", () => ({
	checkpointNumber: vi.fn(async () => 3),
}));
vi.mock("@/services/stripe/server", () => ({}));

const { startAiCheckpoint } = await import(
	"@/services/checkpoints/flows/payment"
);
const {
	adviseOnPlan,
	closeDueCheckpoints,
	writeBriefFor,
	writeDueBriefs,
	writeDueReviews,
} = await import("@/services/checkpoints/flows/review");
const { journal } = await import("@/repositories/checkpoints/journal");

// Started Thursday 1 Oct: sprint 1 is 1–7 Oct, its review on day 8.
const startedAt = new Date("2026-10-01T00:00:00Z");
const person = (id: string) => ({ id, email: `${id}@x.test` });

beforeEach(() => {
	vi.clearAllMocks();
	checkpointUpdateMany.mockResolvedValue({ count: 1 });
});

describe("startAiCheckpoint", () => {
	it("starts today when the day picked passed before the payment", async () => {
		checkpointFindUniqueOrThrow.mockResolvedValue({ startedAt });
		const now = new Date("2026-10-04T15:00:00Z");
		expect(await startAiCheckpoint("cp", "pay", now)).toBe(true);

		const { where, data } = checkpointUpdateMany.mock.calls[0][0];
		expect(where).toEqual({
			id: "cp",
			status: {
				in: [CheckpointStatus.Draft, CheckpointStatus.AwaitingCurator],
			},
		});
		expect(data).toMatchObject({
			status: CheckpointStatus.Active,
			paymentId: "pay",
			startedAt: new Date("2026-10-04T00:00:00Z"),
			dueAt: new Date("2026-10-31T00:00:00Z"),
			goalAgreedAt: null,
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
		await vi.waitFor(() => expect(writeFirstLetter).toHaveBeenCalledWith("cp"));
	});

	it("keeps a day still ahead", async () => {
		checkpointFindUniqueOrThrow.mockResolvedValue({ startedAt });
		await startAiCheckpoint("cp", "pay", new Date("2026-09-29T10:00:00Z"));
		expect(checkpointUpdateMany.mock.calls[0][0].data.startedAt).toEqual(
			startedAt,
		);
	});

	it("books nothing and writes no letter when it already started or was called off", async () => {
		checkpointFindUniqueOrThrow.mockResolvedValue({ startedAt });
		checkpointUpdateMany.mockResolvedValueOnce({ count: 0 });

		expect(
			await startAiCheckpoint("cp", "pay", new Date("2026-10-04T15:00:00Z")),
		).toBe(false);
		expect(sessionDeleteMany).not.toHaveBeenCalled();
		expect(sessionCreateMany).not.toHaveBeenCalled();
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(writeFirstLetter).not.toHaveBeenCalled();
	});
});

const items = [
	{ id: "t1", text: "Loop", cut: false, originalText: null, addedAt: null, evidence: [] },
	{
		id: "t2",
		text: "One-pager",
		cut: false,
		originalText: null,
		addedAt: null,
		evidence: [
			{
				match: null,
				matchNote: null,
				artifact: { id: "a", type: "Document", name: "Doc", link: "x", checkStatus: "Readable" },
			},
		],
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
		{
			week: index - 1,
			confirmedAt: new Date(),
			teamMember: { position: null, speciality: { name: "Game designer" } },
		},
		{
			week: index - 1,
			confirmedAt: null,
			teamMember: { position: "Lead artist", speciality: { name: "Artist" } },
		},
	],
	project: {
		name: "Hollow Tide",
		slug: "hollow-tide",
		author: person("author"),
		team: { members: [{ user: person("author") }, { user: person("oleg") }] },
	},
	...overrides,
});

const assessment = {
	inShort: "Done.",
	discussed: [
		{ itemId: "t1", text: "Shown." },
		{ itemId: "made-up", text: "?" },
	],
	notDiscussed: ["made-up"],
	outsidePlan: [],
	questions: [],
};
const letter = {
	message: "Good start.",
	agreed: [{ text: "Test it", itemId: "made-up", dueDay: null }],
};

describe("writeDueReviews", () => {
	beforeEach(() => {
		sessionFindMany.mockResolvedValue([{ id: "s2" }]);
		sessionUpdateMany.mockResolvedValue({ count: 1 });
		reviewSprint.mockImplementation(
			async (_input: unknown, advise: ((review: string) => unknown) | null) => ({
				message: letter.message,
				notes: { ...assessment, agreed: letter.agreed },
				advice: advise ? await advise("The review.") : null,
			}),
		);
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
		expect(reviewSprint).not.toHaveBeenCalled();
	});

	it("reviews the sprint behind, drops made-up ids and tells the team once each", async () => {
		sessionFindUniqueOrThrow.mockResolvedValue({ index: 2, checkpointId: "cp" });
		checkpointFindUniqueOrThrow.mockResolvedValue(reviewed(2));
		const now = new Date("2026-10-08T01:00:00Z");
		expect(await writeDueReviews(now)).toBe(1);

		const input = reviewSprint.mock.calls[0][0];
		expect(input.sprint).toBe(1);
		// The sprint's build video and other artifacts beside its tasks.
		expect(input.artifactsSeen).toEqual([
			'GameplayVideo "Sprint 1 build" https://x.test/v: one tide loop played through',
		]);
		// The team in one block, with each member's weeks: the sprint's pulse is read from it.
		expect(input.team.people.map((person: { role: string }) => person.role)).toEqual([
			"Game designer",
			"Lead artist",
		]);
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
				"https://gdhub.test/user/project/hollow-tide/workflow/cp3?sprint=2&tab=review",
			],
			[
				"oleg",
				"cp-review-s2-oleg",
				"https://gdhub.test/user/project/hollow-tide/workflow/cp3?sprint=2&tab=review",
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
			review: "The review.",
		});
		const { advice } = sessionUpdate.mock.calls[0][0].data.content;
		expect(advice.tasks.map((row: { itemId: string }) => row.itemId)).toEqual(["t1"]);
		expect(advice.add).toEqual(["Playtest"]);
		expect(advice.hash).toMatch(/^[0-9a-f]{64}$/);
	});

	it("writes the final review and leaves the verdict to the step after it", async () => {
		sessionFindUniqueOrThrow.mockResolvedValue({ index: 5, checkpointId: "cp" });
		checkpointFindUniqueOrThrow.mockResolvedValue(reviewed(5));
		expect(await writeDueReviews()).toBe(1);

		expect(reviewSprint.mock.calls[0][0].final).toBe(true);
		expect(closeCheckpoint).not.toHaveBeenCalled();
		expect(notify).not.toHaveBeenCalled();
	});

	it("hands the session back when the model gives nothing", async () => {
		sessionFindUniqueOrThrow.mockResolvedValue({ index: 2, checkpointId: "cp" });
		checkpointFindUniqueOrThrow.mockResolvedValue(reviewed(2));
		reviewSprint.mockResolvedValue(null);
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
	const firstLetter = {
		message: "Hello! Write your tasks.",
		notes: null,
		advice: null,
		goal: { fit: "fits", note: "Fits." },
		suggestions: [],
	};
	const plan = (
		content: unknown = firstLetter,
		planCheckedAt: Date | null = null,
	) => ({
		curatorId: null,
		curatorKind: CheckpointCuratorKind.AI,
		goal: "A greybox",
		goalAgreedAt: null as Date | null,
		planCheckedAt,
		scopeConfirmedAt: null,
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

	it("checks the sent tasks once on day 1 and tells the author", async () => {
		checkpointFindUnique.mockResolvedValue(plan());
		writePlanAdvice.mockResolvedValue({
			...advice,
			goal: { fit: "narrow", note: "Narrow it." },
		});
		expect(await adviseOnPlan("cp", "author", onDay1)).toBeNull();
		expect(writePlanAdvice.mock.calls[0][0].moment).toBe("start");
		const { where, data } = sessionUpdate.mock.calls[0][0];
		expect(where).toEqual({ id: "s1" });
		expect(data.content).toMatchObject({
			message: "Hi.",
			notes: null,
			goal: { fit: "narrow", note: "Narrow it." },
		});
		expect(checkpointUpdate).toHaveBeenCalledWith({
			where: { id: "cp" },
			data: { planCheckedAt: onDay1 },
		});
		expect(data.content.advice.tasks).toHaveLength(1);
		// The plan approves itself 12 hours after the check.
		expect(notifyPlanChecked).toHaveBeenCalledWith(
			"cp",
			new Date("2026-10-01T22:00:00Z"),
		);
	});

	it("checks the tasks only once", async () => {
		checkpointFindUnique.mockResolvedValue(plan(firstLetter, onDay1));
		expect(await adviseOnPlan("cp", "author", onDay1)).toBe("alreadyChecked");
		expect(writePlanAdvice).not.toHaveBeenCalled();
	});

	it("refuses to check a plan with no tasks", async () => {
		checkpointFindUnique.mockResolvedValue({
			...plan(),
			items: items.map((item) => ({ ...item, cut: true })),
		});
		expect(await adviseOnPlan("cp", "author", onDay1)).toBe("noTasks");
		expect(writePlanAdvice).not.toHaveBeenCalled();
	});

	it("writes the first letter instead when the read after payment failed", async () => {
		checkpointFindUnique.mockResolvedValue(plan(null));
		writeFirstLetter.mockResolvedValue(true);
		expect(await adviseOnPlan("cp", "author", onDay1)).toBeNull();
		expect(writeFirstLetter).toHaveBeenCalledWith("cp", { notify: false });
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

	// GDHUB-125: day 15 runs day 1's loop — the author sends the changes, the
	// curator checks them once, and only then can they be confirmed.
	describe("on day 15", () => {
		const onDay15 = new Date("2026-10-15T10:00:00Z");
		const review = {
			message: "Sprint 2 review.",
			notes: { inShort: "Two sprints in." },
			advice: { tasks: [], add: [], hash: "the review's" },
		};
		const halfway = (content: unknown = review) => ({
			...plan(),
			goalAgreedAt: startedAt,
			planCheckedAt: startedAt,
			sessions: [
				{ id: "s1", index: 1, scheduledAt: startedAt, endedAt: null, content: firstLetter },
				{
					id: "s3",
					index: 3,
					scheduledAt: new Date("2026-10-15T00:00:00Z"),
					// The window opens once the review is written.
					endedAt: new Date("2026-10-15T01:00:00Z"),
					content,
				},
			],
		});

		it("checks the changes sent and marks day 15 checked", async () => {
			checkpointFindUnique.mockResolvedValue(halfway());
			writePlanAdvice.mockResolvedValue({ ...advice, message: null, goal: null });
			expect(await adviseOnPlan("cp", "author", onDay15)).toBeNull();
			expect(writePlanAdvice.mock.calls[0][0].moment).toBe("midway");
			const { where, data } = sessionUpdate.mock.calls[0][0];
			expect(where).toEqual({ id: "s3" });
			expect(data.content).toMatchObject({
				message: "Sprint 2 review.",
				checkedAt: onDay15.toISOString(),
			});
		});

		it("checks the changes only once", async () => {
			checkpointFindUnique.mockResolvedValue(
				halfway({ ...review, checkedAt: onDay15.toISOString() }),
			);
			expect(await adviseOnPlan("cp", "author", onDay15)).toBe("alreadyChecked");
			expect(writePlanAdvice).not.toHaveBeenCalled();
		});
	});

	// With a person curating, the goal checks go to their brief, not the author.
	it("keeps the goal checks off a pro checkpoint's draft advice", async () => {
		checkpointFindUnique.mockResolvedValue({
			...plan(),
			curatorId: "patrick",
			curatorKind: CheckpointCuratorKind.Human,
			sessions: [
				{
					id: "s1",
					index: 1,
					scheduledAt: new Date("2026-10-01T14:00:00Z"),
					endedAt: null,
					content: null,
				},
			],
		});
		writePlanAdvice.mockResolvedValue({
			...advice,
			tasks: [
				...advice.tasks,
				{ itemId: "t1", kind: "offGoal", note: "Off the goal.", suggestion: null },
			],
			goal: { fit: "fits", note: "Fits.", stage: { inside: false, note: "Past it." } },
		});
		expect(await adviseOnPlan("cp", "author", onDay1)).toBeNull();
		const { content } = sessionUpdate.mock.calls[0][0].data;
		expect(content.advice.tasks.map((row: { kind: string }) => row.kind)).toEqual([
			"vague",
		]);
		expect(content.goal).toEqual({ fit: "fits", note: "Fits.", stage: null });
	});

	it("refuses once the plan is approved", async () => {
		checkpointFindUnique.mockResolvedValue({ ...plan(), goalAgreedAt: onDay1 });
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
		writeSprintReview.mockResolvedValue(assessment);

		await expect(writeBriefFor("s3")).resolves.toBe(true);

		const [input, meter] = writeSprintReview.mock.calls[0];
		expect(input.sprint).toBe(2);
		expect(input.focusLastReview).toEqual(["Fix the tide timer"]);
		expect(meter).toEqual({ checkpointId: "cp", purpose: "callBrief" });
		const entry = vi.mocked(journal).mock.calls[0][0];
		expect(entry).toMatchObject({ kind: "Review", sprint: 2 });
		expect(
			(entry.output as { notes: typeof assessment }).notes.discussed,
		).toEqual([{ itemId: "t1", text: "Shown." }]);
		expect(notify).not.toHaveBeenCalled();
		// Call 3 comes before the plan changes: its brief carries no goal checks.
		expect(writePlanAdvice).not.toHaveBeenCalled();
	});

	// GDHUB-125: the plan set on call 1 is checked against the goal and its
	// stage in the brief for call 2, for the curator.
	it("carries the goal checks into the brief for call 2", async () => {
		sessionFindUniqueOrThrow.mockResolvedValue({ index: 2, checkpointId: "cp" });
		journalFindFirst.mockResolvedValue(null);
		checkpointFindUniqueOrThrow.mockResolvedValue(reviewed(2));
		writeSprintReview.mockResolvedValue(assessment);
		writePlanAdvice.mockResolvedValue({
			message: null,
			tasks: [
				{ itemId: "t1", kind: "offGoal", note: "Off the goal.", suggestion: null },
				// Done tasks and made-up ids never reach the curator.
				{ itemId: "t2", kind: "clear", note: "Done.", suggestion: null },
			],
			add: [],
			goal: { fit: "fits", note: "Fits.", stage: { inside: false, note: "Past it." } },
		});

		await expect(writeBriefFor("s2")).resolves.toBe(true);

		expect(writePlanAdvice.mock.calls[0][0]).toMatchObject({
			moment: "start",
			review: "Done.",
		});
		const { output } = vi.mocked(journal).mock.calls[0][0] as {
			output: { goal: unknown; advice: { tasks: { itemId: string }[] } };
		};
		expect(output.goal).toMatchObject({ stage: { inside: false } });
		expect(output.advice.tasks.map((row) => row.itemId)).toEqual(["t1"]);
	});

	it("is written once per call", async () => {
		sessionFindUniqueOrThrow.mockResolvedValue({ index: 3, checkpointId: "cp" });
		journalFindFirst.mockResolvedValue({ id: "e1" });

		await expect(writeBriefFor("s3")).resolves.toBe(false);
		expect(writeSprintReview).not.toHaveBeenCalled();
	});
});

describe("closeDueCheckpoints", () => {
	it("settles each final-reviewed AI checkpoint and tells the author once it holds", async () => {
		checkpointFindMany.mockResolvedValueOnce([{ id: "cp1" }, { id: "cp2" }]);
		closeCheckpoint
			.mockResolvedValueOnce({ verdict: CheckpointVerdict.GoalMet })
			.mockResolvedValueOnce(null);
		expect(await closeDueCheckpoints()).toBe(1);
		expect(notifyVerdictSent).toHaveBeenCalledTimes(1);
		expect(notifyVerdictSent).toHaveBeenCalledWith("cp1");
	});

	it("asks only for AI checkpoints in Review, undecided, with the final review written", async () => {
		await closeDueCheckpoints();
		const { where } = checkpointFindMany.mock.calls[0][0] as { where: Record<string, unknown> };
		expect(where).toMatchObject({
			curatorKind: CheckpointCuratorKind.AI,
			status: CheckpointStatus.Review,
			verdict: null,
		});
	});
});
