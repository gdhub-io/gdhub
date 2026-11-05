import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const checkpointFind = vi.fn();
const previousFind = vi.fn();
const artifactFind = vi.fn();
const reportFind = vi.fn();
const userFind = vi.fn();

vi.mock("@/services/prisma", () => ({
	prisma: {
		projectCheckpoint: {
			findUnique: (...a: unknown[]) => checkpointFind(...a),
			findFirst: (...a: unknown[]) => previousFind(...a),
		},
		projectArtifact: { findMany: (...a: unknown[]) => artifactFind(...a) },
		projectReport: { findMany: (...a: unknown[]) => reportFind(...a) },
		user: { findMany: (...a: unknown[]) => userFind(...a) },
	},
}));

const { getJournalView } = await import("@/repositories/checkpoints/journal-view");

const startedAt = new Date("2026-09-01T00:00:00Z");
const at = (iso: string) => new Date(iso);

const checkpoint = {
	id: "cp1",
	projectId: "p1",
	status: "Active",
	verdict: null,
	goal: "A playable slice",
	curatorKind: "AI",
	curatorCharacter: null,
	startedAt,
	dueAt: at("2026-09-28T00:00:00Z"),
	planCheckedAt: at("2026-09-01T14:21:00Z"),
	goalAgreedAt: at("2026-09-01T18:02:00Z"),
	goalAgreedById: "u-marta",
	scopeConfirmedAt: null,
	curator: null,
	project: { authorId: "u-marta" },
	items: [
		{ id: "o1", kind: "Outcome", text: "Demo on itch.io", originalText: null, cut: false, addedAt: null, evidence: [{ match: "Matches", matchNote: null, artifact: { id: "a1", name: "Demo", type: "ExecutableBuild", link: "https://x.itch.io", createdAt: at("2026-09-05T18:40:00Z") } }] },
		{ id: "i1", kind: "Input", text: "A paper map", originalText: null, cut: false, addedAt: null, evidence: [] },
	],
	pulses: [
		{ id: "p-mail", week: 2, confirmedAt: at("2026-09-14T09:00:00Z"), source: "email", teamMember: { userId: "u-tom" } },
		{ id: "p-auto", week: 2, confirmedAt: at("2026-09-14T01:00:00Z"), source: "devlog", teamMember: { userId: "u-ivo" } },
	],
	journal: [
		{ id: "j-first", kind: "Letter", sprint: null, link: null, devlogId: null, itemId: null, input: { letter: "first" }, output: { note: "Ahoy." }, createdAt: at("2026-09-01T09:00:00Z") },
		{ id: "j-sent", kind: "Platform", sprint: null, link: null, devlogId: null, itemId: null, input: { to: "u-marta" }, output: { title: "Read the goal", message: "…", sent: true }, createdAt: at("2026-09-01T09:01:00Z") },
		{ id: "j-look", kind: "Evidence", sprint: 1, link: "https://x.itch.io", devlogId: null, itemId: "o1", input: { task: "Demo on itch.io", artifactName: "Demo", unread: null }, output: { match: "Matches", note: "A playable build." }, createdAt: at("2026-09-05T18:41:00Z") },
		{ id: "j-review", kind: "Review", sprint: 1, link: null, devlogId: null, itemId: null, input: {}, output: { message: "On course." }, createdAt: at("2026-09-08T01:04:00Z") },
	],
};

beforeEach(() => {
	vi.clearAllMocks();
	checkpointFind.mockResolvedValue(checkpoint);
	artifactFind.mockImplementation(async ({ where }) =>
		where.createdAt.lt
			? [{ id: "b1", name: "Concept", type: "Document", link: "https://c", createdAt: at("2026-08-20T00:00:00Z") }]
			: [{ id: "a1", name: "Demo", type: "ExecutableBuild", link: "https://x.itch.io", createdAt: at("2026-09-05T18:40:00Z"), createdById: "u-ivo" }],
	);
	previousFind.mockResolvedValue(null);
	reportFind.mockResolvedValue([]);
	userFind.mockResolvedValue([
		{ id: "u-marta", name: "Marta" },
		{ id: "u-tom", name: "Tom" },
		{ id: "u-ivo", name: "Ivo" },
	]);
});

describe("getJournalView", () => {
	it("puts the curator and the platform on the left and the team on the right, oldest first", async () => {
		const view = await getJournalView("cp1");
		expect(view?.messages.map((row) => [row.id, row.side, row.kind])).toEqual([
			["j-first", "curator", "letter"],
			["j-sent", "platform", "sent"],
			["tasks-sent", "team", "tasksSent"],
			["plan-approved", "team", "planApproved"],
			["a1", "team", "artifact"],
			["j-look", "curator", "looked"],
			["j-review", "curator", "letter"],
			["p-auto", "platform", "pulseCounted"],
			["p-mail", "team", "pulse"],
		]);
	});

	it("names who acted and places each line in its sprint", async () => {
		const view = await getJournalView("cp1");
		const byId = new Map(view?.messages.map((row) => [row.id, row]));
		expect(byId.get("j-sent")?.who).toBe("Marta");
		expect(byId.get("a1")).toMatchObject({ who: "Ivo", sprint: 1 });
		expect(byId.get("p-mail")).toMatchObject({ who: "Tom", sprint: 2 });
		expect(byId.get("j-first")?.variant).toBe("first");
	});

	it("keeps the inputs apart from the tasks, with what the project made before", async () => {
		const view = await getJournalView("cp1");
		expect(view?.plan.tasks.map((task) => task.id)).toEqual(["o1"]);
		expect(view?.plan.tasks[0]).toMatchObject({
			doneIn: 1,
			evidence: [{ name: "Demo", link: "https://x.itch.io", match: "Matches", note: null }],
		});
		expect(view?.inputs.items.map((item) => item.id)).toEqual(["i1"]);
		expect(view?.inputs.before.map((row) => row.id)).toEqual(["b1"]);
		expect(view?.artifacts[0]).toMatchObject({
			tasks: ["Demo on itch.io"],
			read: { match: "Matches", text: "A playable build." },
		});
	});

	it("names every task an artifact proves, on its message and in the list", async () => {
		const [demo] = checkpoint.items;
		checkpointFind.mockResolvedValue({
			...checkpoint,
			items: [
				demo,
				{ ...demo, id: "o2", text: "Five playtesters", evidence: demo.evidence },
			],
		});

		const view = await getJournalView("cp1");

		expect(view?.artifacts[0].tasks).toEqual(["Demo on itch.io", "Five playtesters"]);
		expect(
			view?.messages.find((row) => row.id === "a1")?.details,
		).toEqual([
			{ label: "task", value: "Demo on itch.io" },
			{ label: "task", value: "Five playtesters" },
			{ label: "link", value: "https://x.itch.io" },
		]);
	});

	it("is null for a checkpoint that does not exist", async () => {
		checkpointFind.mockResolvedValue(null);
		expect(await getJournalView("nope")).toBeNull();
	});

	it("lists the devlogs before the start under the inputs, oldest first, with their media looks", async () => {
		const devlog = (id: string, iso: string, content: string) => ({
			id,
			number: null,
			content,
			video: null,
			contentEditor: null,
			publishedAt: at(iso),
			authorId: "u-marta",
		});
		reportFind.mockImplementation(async ({ where }) =>
			where.publishedAt.gte
				? []
				: [
						devlog("d1", "2026-08-01T10:00:00Z", "Greybox of the island"),
						devlog("d2", "2026-08-20T10:00:00Z", "The tide rule"),
					],
		);
		checkpointFind.mockResolvedValue({
			...checkpoint,
			journal: [
				...checkpoint.journal,
				{ id: "j-media", kind: "DevlogMedia", sprint: 0, link: "https://img/1.png", devlogId: "d2", itemId: null, input: { devlog: "The tide", unread: null }, output: { shows: "A beach at low tide." }, createdAt: at("2026-09-01T08:00:00Z") },
			],
		});

		const view = await getJournalView("cp1");

		expect(view?.inputs.devlogs.map((row) => [row.id, row.text])).toEqual([
			["d1", "Greybox of the island"],
			["d2", "The tide rule"],
		]);
		expect(view?.inputs.devlogs[1].media[0]).toMatchObject({
			text: "A beach at low tide.",
		});
		// The window ends at the start; at the first checkpoint nothing bounds it before.
		expect(reportFind.mock.calls.at(-1)?.[0].where.publishedAt).toEqual({
			lt: startedAt,
		});
	});

	describe("which answers an admin may write again (GDHUB-156)", () => {
		beforeEach(() => {
			// Day 10: sprint 2, after the sprint 1 review.
			vi.useFakeTimers({ toFake: ["Date"], now: at("2026-09-10T12:00:00Z") });
		});
		afterEach(() => vi.useRealTimers());

		it("offers the step of the latest answer and after it, never day one once a review built on it", async () => {
			const view = await getJournalView("cp1");
			const byId = new Map(view?.messages.map((row) => [row.id, row]));
			expect(byId.get("j-first")?.regenerable).toBe(false);
			expect(byId.get("j-look")?.regenerable).toBe(true);
			expect(byId.get("j-review")?.regenerable).toBe(true);
			// Rule-based rows never.
			expect(byId.get("j-sent")?.regenerable).toBe(false);
			expect(view?.steps.map((row) => row.rebuildable)).toEqual([
				false,
				true,
				true,
				false,
				false,
			]);
		});

		it("offers nothing once the verdict is decided", async () => {
			checkpointFind.mockResolvedValue({ ...checkpoint, verdict: "GoalMet" });
			const view = await getJournalView("cp1");
			expect(view?.messages.some((row) => row.regenerable)).toBe(false);
			expect(view?.steps.some((row) => row.rebuildable)).toBe(false);
		});

		it("shows how often an answer was replaced, and what it said before", async () => {
			checkpointFind.mockResolvedValue({
				...checkpoint,
				journal: checkpoint.journal.map((entry) =>
					entry.id === "j-review"
						? {
								...entry,
								input: {
									revisions: [
										{ at: "2026-09-09T10:00:00.000Z", by: "admin", mode: "regenerate", hint: "Read the build page", previousOutput: { message: "Unclear." } },
									],
								},
							}
						: entry,
				),
			});
			const view = await getJournalView("cp1");
			expect(view?.messages.find((row) => row.id === "j-review")?.history).toEqual([
				{ at: "2026-09-09T10:00:00.000Z", mode: "regenerate", hint: "Read the build page", previous: "Unclear." },
			]);
			// The history is not sent a second time inside the source.
			expect(view?.messages.find((row) => row.id === "j-review")?.source).toEqual({
				input: {},
				output: { message: "On course." },
			});
		});
	});
});
