import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckpointSessionContentStatus } from "@/config/prisma-enums";

const findMany = vi.fn();
const updateMany = vi.fn();
const update = vi.fn();
const findUniqueOrThrow = vi.fn();
const writeCallNotes = vi.fn();
const notify = vi.fn();

vi.mock("@/services/call-notes", async (original) => ({
	...(await original<typeof import("@/services/call-notes")>()),
	writeCallNotes: (...a: unknown[]) => writeCallNotes(...a),
}));
vi.mock("@/services/checkpoint-notifications", () => ({
	appUrl: () => "https://gdhub.test",
	notify: (...a: unknown[]) => notify(...a),
	recipient: { select: { id: true, email: true } },
	reviewUrl: (slug: string, number: number, index: number) =>
		`https://gdhub.test/user/project/${slug}/workflow/cp${number}/review/${index}`,
}));
vi.mock("@/repositories/checkpoint-number", () => ({
	checkpointNumber: vi.fn(async () => 1),
}));
vi.mock("@/services/prisma", () => ({
	prisma: {
		checkpointSession: {
			findMany: (...a: unknown[]) => findMany(...a),
			updateMany: (...a: unknown[]) => updateMany(...a),
			update: (...a: unknown[]) => update(...a),
			findUniqueOrThrow: (...a: unknown[]) => findUniqueOrThrow(...a),
		},
		projectReport: { findMany: vi.fn(async () => [{ content: "Devlog" }]) },
		projectArtifact: { findMany: vi.fn(async () => []) },
	},
}));

const { writeDueCallNotes } = await import(
	"@/repositories/checkpoint-call-notes"
);

const person = (id: string) => ({ id, email: `${id}@x.test` });
const session = {
	index: 2,
	transcript: [{ recordingId: "r1", startedAt: "", text: "Speaker 0: hello" }],
	checkpoint: {
		id: "cp",
		projectId: "p",
		createdAt: new Date(),
		startedAt: new Date("2026-10-05T00:00:00Z"),
		goal: "A greybox",
		curator: person("curator"),
		items: [
			{ id: "t1", text: "Loop", cut: false, originalText: null, evidence: [] },
		],
		sessions: [],
		project: {
			name: "Hollow Tide",
			slug: "hollow-tide",
			team: { members: [{ user: person("marta") }] },
		},
	},
};
const notes = {
	inShort: "Done.",
	discussed: [
		{ itemId: "t1", text: "Shown." },
		{ itemId: "made-up", text: "?" },
	],
	notDiscussed: ["made-up"],
	outsidePlan: [],
	agreed: [{ text: "Test it", itemId: "made-up", dueDay: 14 }],
	questions: [],
};

beforeEach(() => {
	vi.clearAllMocks();
	findMany.mockResolvedValue([{ id: "s2" }]);
	updateMany.mockResolvedValue({ count: 1 });
	findUniqueOrThrow.mockResolvedValue(session);
});

describe("writeDueCallNotes", () => {
	it("waits for the recording to settle and takes only untouched sessions", async () => {
		writeCallNotes.mockResolvedValue(notes);
		const now = new Date("2026-10-14T12:00:00Z");
		await writeDueCallNotes(now);
		const where = findMany.mock.calls[0][0].where;
		expect(where.endedAt).toEqual({ lt: new Date("2026-10-14T11:30:00Z") });
		expect(where.contentStatus).toBeNull();
		expect(updateMany).toHaveBeenCalledWith({
			where: { id: "s2", contentStatus: null },
			data: { contentStatus: CheckpointSessionContentStatus.Pending },
		});
	});

	it("leaves a session another run claimed", async () => {
		updateMany.mockResolvedValue({ count: 0 });
		expect(await writeDueCallNotes()).toBe(0);
		expect(writeCallNotes).not.toHaveBeenCalled();
	});

	it("drops task ids the model made up and tells everyone, once each", async () => {
		writeCallNotes.mockResolvedValue(notes);
		expect(await writeDueCallNotes()).toBe(1);

		const saved = update.mock.calls[0][0].data;
		expect(saved.contentStatus).toBe(CheckpointSessionContentStatus.Ready);
		expect(saved.content.discussed).toEqual([{ itemId: "t1", text: "Shown." }]);
		expect(saved.content.notDiscussed).toEqual([]);
		expect(saved.content.agreed[0].itemId).toBeNull();

		const letters = Object.fromEntries(
			notify.mock.calls.map(([to, id, payload]) => [to.id, { id, url: payload.redirectUrl }]),
		);
		expect(Object.keys(letters).sort()).toEqual(["curator", "marta"]);
		expect(letters.marta.url).toBe(
			"https://gdhub.test/user/project/hollow-tide/workflow/cp1/review/2",
		);
		expect(letters.curator.url).toBe(
			"https://gdhub.test/advisor/checkpoints/cp/review/2",
		);
		expect(letters.marta.id).toBe("cp-notes-s2-marta");
	});

	it("hands the session back when the model gives nothing", async () => {
		writeCallNotes.mockResolvedValue(null);
		expect(await writeDueCallNotes()).toBe(0);
		expect(update).toHaveBeenCalledWith({
			where: { id: "s2" },
			data: { contentStatus: null },
		});
		expect(notify).not.toHaveBeenCalled();
	});
});
