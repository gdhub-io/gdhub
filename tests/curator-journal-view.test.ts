import { beforeEach, describe, expect, it, vi } from "vitest";

const checkpointFind = vi.fn();
const artifactFind = vi.fn();
const reportFind = vi.fn();
const userFind = vi.fn();

vi.mock("@/services/prisma", () => ({
	prisma: {
		projectCheckpoint: { findUnique: (...a: unknown[]) => checkpointFind(...a) },
		projectArtifact: { findMany: (...a: unknown[]) => artifactFind(...a) },
		projectReport: { findMany: (...a: unknown[]) => reportFind(...a) },
		user: { findMany: (...a: unknown[]) => userFind(...a) },
	},
}));

const { getJournalView } = await import("@/repositories/curator-journal-view");

const startedAt = new Date("2026-09-01T00:00:00Z");
const at = (iso: string) => new Date(iso);

const checkpoint = {
	projectId: "p1",
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
		{ id: "o1", kind: "Outcome", text: "Demo on itch.io", originalText: null, cut: false, addedAt: null, evidenceMatch: "Matches", evidenceMatchNote: null, artifact: { id: "a1", name: "Demo", type: "ExecutableBuild", link: "https://x.itch.io", createdAt: at("2026-09-05T18:40:00Z") } },
		{ id: "i1", kind: "Input", text: "A paper map", originalText: null, cut: false, addedAt: null, evidenceMatch: null, evidenceMatchNote: null, artifact: null },
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
		expect(view?.plan.tasks[0]).toMatchObject({ doneIn: 1, match: "Matches" });
		expect(view?.inputs.items.map((item) => item.id)).toEqual(["i1"]);
		expect(view?.inputs.before.map((row) => row.id)).toEqual(["b1"]);
		expect(view?.artifacts[0]).toMatchObject({
			task: "Demo on itch.io",
			read: { match: "Matches", text: "A playable build." },
		});
	});

	it("is null for a checkpoint that does not exist", async () => {
		checkpointFind.mockResolvedValue(null);
		expect(await getJournalView("nope")).toBeNull();
	});
});
