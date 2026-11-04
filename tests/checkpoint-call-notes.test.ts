import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckpointSessionContentStatus } from "@/config/prisma-enums";

vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://gdhub.test");

const findMany = vi.fn();
const updateMany = vi.fn();
const update = vi.fn();
const findUniqueOrThrow = vi.fn();
const writeCallNotes = vi.fn();
const notify = vi.fn();

vi.mock("@/services/checkpoints/call-notes", async (original) => ({
	...(await original<typeof import("@/services/checkpoints/call-notes")>()),
	writeCallNotes: (...a: unknown[]) => writeCallNotes(...a),
}));
vi.mock("@/services/checkpoints/notifications", () => ({
	notify: (...a: unknown[]) => notify(...a),
}));
const briefDirection = vi.fn(async (..._a: unknown[]) => undefined as unknown);
vi.mock("@/repositories/checkpoints/call", () => ({
	briefDirection: (...a: unknown[]) => briefDirection(...a),
}));
vi.mock("@/repositories/checkpoints/number", () => ({
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
	"@/services/checkpoints/flows/call-notes"
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
			name: "E2E Test Game",
			slug: "e2e-test-game",
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
			"https://gdhub.test/user/project/e2e-test-game/workflow/cp1?sprint=2&tab=review",
		);
		expect(letters.curator.url).toBe(
			"https://gdhub.test/advisor/checkpoints/cp/review/2",
		);
		expect(letters.marta.id).toBe("cp-notes-s2-marta");
	});

	it("presets the direction the call did not name from the brief, unconfirmed", async () => {
		const brief = {
			goal: { value: "toward", why: "The jump was shown." },
			stage: { value: "stalled", why: "No level yet." },
		};
		briefDirection.mockResolvedValueOnce(brief);
		writeCallNotes.mockResolvedValue(notes);
		await writeDueCallNotes();

		expect(update.mock.calls[0][0].data.content.direction).toEqual({
			...brief,
			confirmedAt: null,
		});
	});

	it("keeps the call's own word on the direction over the brief's", async () => {
		const said = {
			goal: { value: "sideways", why: "The sprint went into a menu." },
			stage: { value: "stalled", why: "Nothing playable." },
		};
		writeCallNotes.mockResolvedValue({ ...notes, direction: said });
		await writeDueCallNotes();

		expect(briefDirection).not.toHaveBeenCalled();
		expect(update.mock.calls[0][0].data.content.direction.goal.value).toBe("sideways");
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
