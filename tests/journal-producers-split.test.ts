import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * GDHUB-156 split every AI journal producer into a compute half (reused by
 * regenerate) and a write half. The scheduled runs must write exactly what
 * they wrote before: these fixtures pin the rows, the calls and the budgets.
 */

const journalFind = vi.fn();
const evidenceFind = vi.fn();
const evidenceUpdate = vi.fn();
const checkpointFind = vi.fn();
const previousFind = vi.fn();
const reportFind = vi.fn();
const journal = vi.fn();

vi.mock("@/services/prisma", () => ({
	prisma: {
		checkpointJournalEntry: { findMany: (...a: unknown[]) => journalFind(...a) },
		checkpointItemEvidence: {
			findMany: (...a: unknown[]) => evidenceFind(...a),
			update: (...a: unknown[]) => evidenceUpdate(...a),
		},
		checkpointItem: { findMany: async () => [] },
		projectCheckpoint: {
			findUnique: (...a: unknown[]) => checkpointFind(...a),
			findFirst: (...a: unknown[]) => previousFind(...a),
		},
		projectReport: { findMany: (...a: unknown[]) => reportFind(...a) },
	},
}));
vi.mock("@/repositories/checkpoints/journal", async (original) => ({
	...(await original<typeof import("@/repositories/checkpoints/journal")>()),
	journal: (...a: unknown[]) => journal(...a),
}));

const readEvidence = vi.fn();
vi.mock("@/services/evidence/read", () => ({
	readEvidence: (...a: unknown[]) => readEvidence(...a),
}));
const describeMedia = vi.fn();
const judgeEvidence = vi.fn();
vi.mock("@/services/evidence/judge", () => ({
	describeMedia: (...a: unknown[]) => describeMedia(...a),
	judgeEvidence: (...a: unknown[]) => judgeEvidence(...a),
}));
vi.mock("@/services/checkpoints/notifications", () => ({
	notifyEvidenceMismatch: vi.fn(),
}));

const reviewSprint = vi.fn();
vi.mock("@/services/checkpoints/ai-review", async (original) => ({
	...(await original<typeof import("@/services/checkpoints/ai-review")>()),
	reviewSprint: (...a: unknown[]) => reviewSprint(...a),
}));

const { seeCheckpointEvidence, seeDayOneDevlogMedia, seeInputArtifacts } =
	await import("@/services/checkpoints/flows/evidence-seen");
const { composeReview } = await import("@/services/checkpoints/flows/review");

const content = (text: string, videoSeconds = 0) => ({
	text,
	images: [],
	videoSeconds,
	unread: null,
});

beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-09-10T12:00:00Z") });
	journalFind.mockResolvedValue([]);
	previousFind.mockResolvedValue(null);
	reportFind.mockResolvedValue([]);
	describeMedia.mockResolvedValue("A level.");
});

describe("day one's input artifacts, as the scheduled run writes them", () => {
	it("journals each look in the shape it always had, charged as evidence", async () => {
		evidenceFind.mockResolvedValue([
			{ artifact: { link: "https://doc", type: "Document", name: "Concept" } },
		]);
		readEvidence.mockResolvedValue(content("The concept."));

		await seeInputArtifacts("cp1");

		expect(readEvidence).toHaveBeenCalledWith("https://doc", {
			videoSecondsLeft: 600,
			pageOnly: false,
			// A web-search read is charged like the look itself.
			meter: { checkpointId: "cp1", purpose: "evidence" },
		});
		expect(describeMedia.mock.calls[0].slice(0, 2)).toEqual([
			content("The concept."),
			{ checkpointId: "cp1", purpose: "evidence" },
		]);
		expect(describeMedia.mock.calls[0][3]).toBeUndefined();
		expect(journal).toHaveBeenCalledWith({
			checkpointId: "cp1",
			kind: "Artifact",
			sprint: 0,
			link: "https://doc",
			input: {
				artifactName: "Concept",
				artifactType: "Document",
				opened: "https://doc",
				text: "The concept.",
				images: 0,
				videoSeconds: 0,
				unread: null,
			},
			output: { shows: "A level." },
		});
	});

	it("counts only artifact looks against the artifact budget, not day one's devlog media", async () => {
		journalFind.mockResolvedValue(
			Array.from({ length: 6 }, (_, index) => ({
				kind: "DevlogMedia",
				devlogId: "d1",
				link: `https://img/${index}.png`,
				input: {},
			})),
		);
		evidenceFind.mockResolvedValue([
			{ artifact: { link: "https://doc", type: "Document", name: "Concept" } },
		]);
		readEvidence.mockResolvedValue(content("x"));

		await seeInputArtifacts("cp1");

		expect(journal).toHaveBeenCalledTimes(1);
	});
});

describe("a task's evidence, as the scheduled run judges it", () => {
	it("writes the match, the seen link and the journal row exactly as before", async () => {
		checkpointFind.mockResolvedValue({
			startedAt: new Date("2026-09-01T00:00:00Z"),
			status: "Active",
		});
		evidenceFind.mockResolvedValue([
			{
				id: "ev1",
				seenLink: null,
				item: { id: "o1", text: "Demo" },
				artifact: { type: "ExecutableBuild", name: "Demo", description: null, link: "https://itch" },
			},
		]);
		reportFind.mockResolvedValue([{ content: "Built the demo.", contentEditor: null }]);
		readEvidence.mockResolvedValue(content("A build page.", 30));
		judgeEvidence.mockResolvedValue({ match: "Matches", note: "A build." });

		await seeCheckpointEvidence("cp1");

		expect(judgeEvidence).toHaveBeenCalledWith(
			{
				task: "Demo",
				artifactType: "ExecutableBuild",
				artifactName: "Demo",
				description: null,
				devlogs: ["Built the demo."],
			},
			content("A build page.", 30),
			{ checkpointId: "cp1", purpose: "evidence" },
			undefined,
		);
		expect(evidenceUpdate).toHaveBeenCalledWith({
			where: { id: "ev1" },
			data: { match: "Matches", matchNote: "A build.", seenLink: "https://itch" },
		});
		expect(journal).toHaveBeenCalledWith({
			checkpointId: "cp1",
			kind: "Evidence",
			sprint: 2,
			link: "https://itch",
			itemId: "o1",
			input: {
				task: "Demo",
				artifactType: "ExecutableBuild",
				artifactName: "Demo",
				description: null,
				opened: "https://itch",
				text: "A build page.",
				images: 0,
				videoSeconds: 30,
				unread: null,
			},
			output: { match: "Matches", note: "A build." },
		});
	});

	it("never judges a link it has already seen", async () => {
		checkpointFind.mockResolvedValue({
			startedAt: new Date("2026-09-01T00:00:00Z"),
			status: "Active",
		});
		evidenceFind.mockResolvedValue([
			{
				id: "ev1",
				seenLink: "https://itch",
				item: { id: "o1", text: "Demo" },
				artifact: { type: "ExecutableBuild", name: "Demo", description: null, link: "https://itch" },
			},
		]);

		await seeCheckpointEvidence("cp1");

		expect(readEvidence).not.toHaveBeenCalled();
		expect(journal).not.toHaveBeenCalled();
	});
});

describe("day one's devlogs (GDHUB-156)", () => {
	const devlog = (id: string, iso: string, link: string) => ({
		id,
		number: null,
		content: `Look: ${link}`,
		video: null,
		contentEditor: null,
		publishedAt: new Date(iso),
		authorId: "u1",
	});

	it("at a later checkpoint reads only since the previous start, and looks at the newest media first as sprint 0", async () => {
		const startedAt = new Date("2026-09-01T00:00:00Z");
		const previous = new Date("2026-07-01T00:00:00Z");
		checkpointFind.mockResolvedValue({ id: "cp2", projectId: "p1", startedAt });
		previousFind.mockResolvedValue({ startedAt: previous });
		reportFind.mockResolvedValue([
			devlog("d1", "2026-07-10T00:00:00Z", "https://img/old.png"),
			devlog("d2", "2026-08-20T00:00:00Z", "https://img/new.png"),
		]);
		readEvidence.mockResolvedValue(content("", 0));
		describeMedia.mockResolvedValue("A beach.");
		readEvidence.mockResolvedValue({ text: null, images: [{}], videoSeconds: 0, unread: null });

		await seeDayOneDevlogMedia("cp2");

		expect(previousFind.mock.calls[0][0].where).toEqual({
			projectId: "p1",
			id: { not: "cp2" },
			startedAt: { not: null, lt: startedAt },
		});
		expect(reportFind.mock.calls[0][0]).toMatchObject({
			where: {
				projectId: "p1",
				isSystem: false,
				publishedAt: { lt: startedAt, gte: previous },
			},
			orderBy: { publishedAt: "asc" },
		});
		expect(journal.mock.calls.map(([row]) => [row.kind, row.sprint, row.devlogId, row.link])).toEqual([
			["DevlogMedia", 0, "d2", "https://img/new.png"],
			["DevlogMedia", 0, "d1", "https://img/old.png"],
		]);
	});
});

describe("a sprint review's compute half", () => {
	it("hands the scheduled run's input to the model untouched, and the hint only when there is one", async () => {
		reviewSprint.mockResolvedValue({
			message: "On course.",
			notes: { inShort: "", discussed: [], notDiscussed: [], outsidePlan: [], questions: [], agreed: [] },
			advice: null,
		});
		const checkpoint = { id: "cp1", items: [] } as unknown as Parameters<typeof composeReview>[0];
		const input = { sprint: 1 } as unknown as Parameters<typeof composeReview>[2];

		const review = await composeReview(checkpoint, 2, input, { purpose: "sprintReview" });

		expect(reviewSprint.mock.calls[0][0]).toEqual(input);
		expect(reviewSprint.mock.calls[0][0].hint).toBeUndefined();
		expect(reviewSprint.mock.calls[0][2]).toEqual({ checkpointId: "cp1", purpose: "sprintReview" });
		expect(Object.keys(review ?? {})).toEqual(["message", "notes", "advice"]);

		await composeReview(checkpoint, 2, input, { purpose: "regenerate", hint: "Read the build" });
		expect(reviewSprint.mock.calls[1][0]).toEqual({ sprint: 1, hint: "Read the build" });
	});
});
