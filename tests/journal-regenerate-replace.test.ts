import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, unknown>();
vi.mock("@/services/cache", () => ({
	cacheGet: async (key: string) => store.get(key),
	cacheSet: async (key: string, value: unknown) => {
		store.set(key, JSON.parse(JSON.stringify(value)));
	},
	cacheTake: async (key: string) => {
		const value = store.get(key);
		store.delete(key);
		return value;
	},
	cacheDelete: async (key: string) => {
		store.delete(key);
	},
}));

const checkpointFind = vi.fn();
const tx = {
	checkpointJournalEntry: {
		update: vi.fn(),
		create: vi.fn(),
	},
	checkpointSession: { findFirst: vi.fn(), update: vi.fn() },
	checkpointItemEvidence: { update: vi.fn() },
	projectCheckpoint: { update: vi.fn() },
};
vi.mock("@/services/prisma", () => ({
	prisma: {
		projectCheckpoint: {
			findUnique: (...a: unknown[]) => checkpointFind(...a),
			update: vi.fn(),
			updateMany: vi.fn(),
		},
		checkpointJournalEntry: { create: vi.fn(), update: vi.fn() },
		checkpointSession: { update: vi.fn(), updateMany: vi.fn() },
		checkpointItemEvidence: { update: vi.fn() },
		$transaction: async (run: (client: typeof tx) => unknown) => run(tx),
	},
}));

const composePlanLetter = vi.fn();
vi.mock("@/services/checkpoints/ai-curator/plan-letter", () => ({
	composePlanLetter: (...a: unknown[]) => composePlanLetter(...a),
}));

const { prisma } = await import("@/services/prisma");
const { draftCacheKey, regenerateEntry, replaceDraft } = await import(
	"@/services/checkpoints/flows/regenerate"
);

const at = (iso: string) => new Date(iso);
const NOW = at("2026-09-10T12:00:00Z");
const ADMIN = "admin-1";

const entry = (
	id: string,
	kind: string,
	sprint: number | null,
	input: unknown,
	output: unknown,
	over: Record<string, unknown> = {},
) => ({
	id,
	kind,
	sprint,
	link: null,
	itemId: null,
	devlogId: null,
	input,
	output,
	createdAt: at("2026-09-01T09:00:00Z"),
	...over,
});

const FIRST = entry("j-first", "Letter", null, { letter: "first" }, { note: "Ahoy." });
const ADVICE = entry(
	"j-advice",
	"Letter",
	null,
	{ moment: "start", goal: "A slice" },
	{ message: "Shorten one.", advice: { tasks: [], add: [], hash: "H1" }, goal: null },
);
const PLAN = entry(
	"j-plan",
	"Letter",
	null,
	{ letter: "plan", goal: "A slice", tasks: ["Demo"], journal: [], reviewOn: "Tue 8 Sep" },
	{ message: "The plan is ready." },
);
const LOOK = entry(
	"j-look",
	"Evidence",
	1,
	{ task: "Demo", text: "old", unread: "empty page" },
	{ match: "CannotTell", note: "empty page" },
	{ link: "https://notion.site/x", itemId: "o1" },
);
const REVIEW = entry("j-review", "Review", 1, { sprint: 1 }, { message: "Unclear.", notes: {}, advice: null });

const SESSION_1 = {
	id: "s1",
	content: {
		message: "Shorten one.",
		notes: null,
		advice: { tasks: [], add: [], hash: "H1" },
		goal: { fit: "fits", note: "Fair." },
		firstLetter: "Ahoy.",
		planLetter: "The plan is ready.",
	},
};
const SESSION_2 = {
	id: "s2",
	content: {
		message: "Unclear.",
		notes: { inShort: "?" },
		advice: null,
		checkedAt: "2026-09-09T00:00:00.000Z",
	},
};

const context = (journal: unknown[], over: Record<string, unknown> = {}) => ({
	id: "cp1",
	projectId: "p1",
	goal: "A slice",
	stageName: "Prototype",
	stepId: null,
	startedAt: at("2026-09-01T00:00:00Z"),
	dueAt: null,
	verdict: null,
	verdictNote: null,
	curatorCharacter: null,
	status: "Active",
	curatorKind: "AI",
	items: [],
	sessions: [],
	journal,
	...over,
});

type Target = { entryId: string } | { step: number };

const draft = (over: Record<string, unknown> & { target: Target }) => ({
	checkpointId: "cp1",
	adminId: ADMIN,
	mode: "regenerate",
	hint: "Read the whole page",
	...over,
});

// Stored under the key the draft's checkpoint, admin and target name.
const put = (key: string, value: ReturnType<typeof draft>) =>
	store.set(
		draftCacheKey(value.checkpointId, value.adminId, value.target, key),
		value,
	);

const KEY = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
	vi.clearAllMocks();
	store.clear();
	vi.useFakeTimers({ toFake: ["Date"], now: NOW });
	checkpointFind.mockResolvedValue(
		context([FIRST, ADVICE, PLAN, LOOK, REVIEW]),
	);
	tx.checkpointSession.findFirst.mockImplementation(
		async ({ where }: { where: { index: number } }) =>
			where.index === 1 ? SESSION_1 : SESSION_2,
	);
});

const reviewDraft = () =>
	draft({
		target: { entryId: "j-review" },
		changes: [
			{
				entryId: "j-review",
				row: { kind: "Review", sprint: 1, link: null, itemId: null, devlogId: null },
				input: null,
				output: { message: "On course.", notes: { inShort: "ok" }, advice: null },
				team: {
					to: "review",
					index: 2,
					review: { message: "On course.", notes: { inShort: "ok" }, advice: null },
				},
			},
		],
	});

describe("Replace", () => {
	it("updates the entry in place and appends the old answer, the hint and who to its history", async () => {
		put(KEY, reviewDraft());

		expect(await replaceDraft("cp1", ADMIN, KEY, { entryId: "j-review" })).toEqual({ ok: true });

		const [{ where, data }] = tx.checkpointJournalEntry.update.mock.calls[0];
		expect(where).toEqual({ id: "j-review" });
		expect(Object.keys(data).sort()).toEqual(["input", "output"]);
		expect(data.output).toEqual({ message: "On course.", notes: { inShort: "ok" }, advice: null });
		expect(data.input).toEqual({
			sprint: 1,
			revisions: [
				{
					at: NOW.toISOString(),
					by: ADMIN,
					mode: "regenerate",
					hint: "Read the whole page",
					previousOutput: REVIEW.output,
				},
			],
		});
		expect(tx.checkpointJournalEntry.create).not.toHaveBeenCalled();
	});

	it("writes the team's copy where the review lives, marked revised, and touches no status, flag, hash or date", async () => {
		put(KEY, reviewDraft());
		await replaceDraft("cp1", ADMIN, KEY, { entryId: "j-review" });

		const [{ where, data }] = tx.checkpointSession.update.mock.calls[0];
		expect(where).toEqual({ id: "s2" });
		// Only the content: never contentStatus, endedAt or anything a cron reads.
		expect(Object.keys(data)).toEqual(["content"]);
		expect(data.content).toEqual({
			message: "On course.",
			notes: { inShort: "ok" },
			// Checked on the author's changes afterwards: stays as it was.
			advice: null,
			checkedAt: "2026-09-09T00:00:00.000Z",
			revisedAt: NOW.toISOString(),
		});
		expect(tx.projectCheckpoint.update).not.toHaveBeenCalled();
		expect(prisma.projectCheckpoint.update).not.toHaveBeenCalled();
		expect(prisma.projectCheckpoint.updateMany).not.toHaveBeenCalled();
	});

	it("keeps the advice's hash, so the plan check neither re-runs nor skips", async () => {
		checkpointFind.mockResolvedValue(context([FIRST, ADVICE, PLAN]));
		put(
			KEY,
			draft({
				target: { entryId: "j-advice" },
				changes: [
					{
						entryId: "j-advice",
						row: { kind: "Letter", sprint: null, link: null, itemId: null, devlogId: null },
						input: null,
						output: { message: "Cut one.", advice: { tasks: [], add: ["X"], hash: "NEW" }, goal: null },
						team: {
							to: "advice",
							index: 1,
							start: true,
							written: { message: "Cut one.", advice: { tasks: [], add: ["X"], hash: "NEW" }, goal: null },
						},
					},
				],
			}),
		);

		await replaceDraft("cp1", ADMIN, KEY, { entryId: "j-advice" });

		const [{ data }] = tx.checkpointSession.update.mock.calls[0];
		expect(Object.keys(data)).toEqual(["content"]);
		expect(data.content).toMatchObject({
			message: "Cut one.",
			advice: { add: ["X"], hash: "H1" },
			firstLetter: "Ahoy.",
			planLetter: "The plan is ready.",
			revisedAt: NOW.toISOString(),
		});
	});

	it("replaces the first letter beside the check's letter, and the goal read without its hash", async () => {
		checkpointFind.mockResolvedValue(context([FIRST, ADVICE, PLAN]));
		const result = { note: "Ahoy again.", goal: { fit: "narrow", note: "Smaller." }, suggestions: [] };
		put(
			KEY,
			draft({
				target: { entryId: "j-first" },
				changes: [
					{
						entryId: "j-first",
						row: { kind: "Letter", sprint: null, link: null, itemId: null, devlogId: null },
						input: null,
						output: result,
						team: { to: "firstLetter", result },
					},
				],
			}),
		);

		await replaceDraft("cp1", ADMIN, KEY, { entryId: "j-first" });

		const [{ data: checkpoint }] = tx.projectCheckpoint.update.mock.calls[0];
		expect(Object.keys(checkpoint)).toEqual(["goalCheck"]);
		const [{ data }] = tx.checkpointSession.update.mock.calls[0];
		expect(data.content).toMatchObject({
			// The check's letter stays the message the team reads.
			message: "Shorten one.",
			firstLetter: "Ahoy again.",
			goal: { fit: "fits", note: "Fair." },
		});
	});

	it("moves an evidence match with the look, and never its seen link", async () => {
		put(
			KEY,
			draft({
				target: { entryId: "j-look" },
				changes: [
					{
						entryId: "j-look",
						row: { kind: "Evidence", sprint: 1, link: "https://notion.site/x", itemId: "o1", devlogId: null },
						input: { task: "Demo", text: "The concept.", unread: null },
						output: { match: "Matches", note: "The concept, all of it." },
						team: { to: "evidence", evidenceId: "ev1", match: "Matches", matchNote: "The concept, all of it." },
					},
				],
			}),
		);

		await replaceDraft("cp1", ADMIN, KEY, { entryId: "j-look" });

		expect(tx.checkpointItemEvidence.update).toHaveBeenCalledWith({
			where: { id: "ev1" },
			data: { match: "Matches", matchNote: "The concept, all of it." },
		});
		const [{ data }] = tx.checkpointJournalEntry.update.mock.calls[0];
		// The new read replaces the old one; the history keeps what it said.
		expect(data.input).toMatchObject({ text: "The concept.", unread: null });
		expect(data.input.revisions[0].previousOutput).toEqual(LOOK.output);
	});

	it("creates a look a rebuild added as a normal journal row", async () => {
		put(
			KEY,
			draft({
				mode: "rebuild",
				hint: null,
				target: { step: 1 },
				changes: [
					{
						entryId: null,
						row: { kind: "Artifact", sprint: 1, link: "https://v", itemId: null, devlogId: null },
						input: { artifactName: "Video", text: null },
						output: { shows: "A level." },
						team: null,
					},
				],
			}),
		);

		expect(await replaceDraft("cp1", ADMIN, KEY, { step: 1 })).toEqual({ ok: true });
		const [{ data }] = tx.checkpointJournalEntry.create.mock.calls[0];
		expect(data).toMatchObject({
			checkpointId: "cp1",
			kind: "Artifact",
			sprint: 1,
			link: "https://v",
			output: { shows: "A level." },
			input: { artifactName: "Video", revisions: [{ mode: "rebuild", by: ADMIN, previousOutput: null }] },
		});
	});
});

describe("the draft's one-time key", () => {
	it("is bound to the checkpoint, the entry and the admin, and a wrong one does not spend it", async () => {
		put(KEY, reviewDraft());

		expect(await replaceDraft("cp1", "someone-else", KEY, { entryId: "j-review" })).toEqual({ ok: false, error: "gone" });
		expect(await replaceDraft("cp2", ADMIN, KEY, { entryId: "j-review" })).toEqual({ ok: false, error: "gone" });
		expect(await replaceDraft("cp1", ADMIN, KEY, { entryId: "j-look" })).toEqual({ ok: false, error: "gone" });
		expect(await replaceDraft("cp1", ADMIN, KEY, { step: 1 })).toEqual({ ok: false, error: "gone" });
		expect(tx.checkpointJournalEntry.update).not.toHaveBeenCalled();

		expect(await replaceDraft("cp1", ADMIN, KEY, { entryId: "j-review" })).toEqual({ ok: true });
	});

	it("is spent by its use: a second Replace finds nothing", async () => {
		put(KEY, reviewDraft());
		await replaceDraft("cp1", ADMIN, KEY, { entryId: "j-review" });
		expect(await replaceDraft("cp1", ADMIN, KEY, { entryId: "j-review" })).toEqual({ ok: false, error: "gone" });
		expect(tx.checkpointJournalEntry.update).toHaveBeenCalledTimes(1);
	});

	it("is refused when the step closed meanwhile, and nothing is written", async () => {
		put(KEY, reviewDraft());
		checkpointFind.mockResolvedValue(
			context([FIRST, ADVICE, PLAN, LOOK, REVIEW], { verdict: "GoalMet" }),
		);
		expect(await replaceDraft("cp1", ADMIN, KEY, { entryId: "j-review" })).toEqual({ ok: false, error: "closed" });
		expect(tx.checkpointJournalEntry.update).not.toHaveBeenCalled();
		expect(tx.checkpointSession.update).not.toHaveBeenCalled();
	});
});

describe("Regenerate", () => {
	it("writes nothing: the draft waits in the cache, bound to the admin", async () => {
		checkpointFind.mockResolvedValue(context([FIRST, ADVICE, PLAN]));
		composePlanLetter.mockResolvedValue("Set out; tell me how it goes.");

		const result = await regenerateEntry("cp1", "j-plan", ADMIN, "Warmer");

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const [change] = result.changes;
		expect(change.current?.text).toBe("The plan is ready.");
		expect(change.draft.text).toBe("Set out; tell me how it goes.");
		// The same prompt with the hint as one extra input, charged as a regeneration.
		expect(composePlanLetter).toHaveBeenCalledWith(
			{ goal: "A slice", tasks: ["Demo"], journal: [], reviewOn: "Tue 8 Sep", hint: "Warmer" },
			{ checkpointId: "cp1", purpose: "regenerate" },
		);
		expect(store.get(draftCacheKey("cp1", ADMIN, { entryId: "j-plan" }, result.draftKey))).toMatchObject({
			checkpointId: "cp1",
			adminId: ADMIN,
			target: { entryId: "j-plan" },
		});
		for (const write of [
			prisma.checkpointJournalEntry.create,
			prisma.checkpointJournalEntry.update,
			prisma.checkpointSession.update,
			prisma.projectCheckpoint.update,
			tx.checkpointJournalEntry.update,
		]) {
			expect(write).not.toHaveBeenCalled();
		}
	});

	it("refuses an answer a later one has built on", async () => {
		expect(await regenerateEntry("cp1", "j-plan", ADMIN, null)).toEqual({ ok: false, error: "closed" });
		expect(composePlanLetter).not.toHaveBeenCalled();
	});
});
