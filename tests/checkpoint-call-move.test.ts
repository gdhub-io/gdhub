import { beforeEach, describe, expect, it, vi } from "vitest";

const sessionFind = vi.fn();
const sessionUpdate = vi.fn();
const freeMoveSlots = vi.fn();
const lockCurator = vi.fn();
const notifyCallMove = vi.fn();

vi.mock("@/services/prisma", () => ({
	prisma: {
		checkpointSession: {
			findUnique: (...a: unknown[]) => sessionFind(...a),
			update: (...a: unknown[]) => sessionUpdate(...a),
		},
		$transaction: (fn: (tx: unknown) => unknown) =>
			fn({ checkpointSession: { update: sessionUpdate } }),
	},
}));
vi.mock("@/repositories/advisor-availability", () => ({
	freeMoveSlots: (...a: unknown[]) => freeMoveSlots(...a),
	lockCurator: (...a: unknown[]) => lockCurator(...a),
}));
vi.mock("@/services/checkpoint-notifications", () => ({
	notifyCallMove: (...a: unknown[]) => notifyCallMove(...a),
}));

const { answerCallMove, askCallMove, callMoveOptions, withdrawCallMove } =
	await import("@/repositories/checkpoint-call-move");

// Call 2 on Thu 8 Oct 14:00; the checkpoint started on 1 Oct.
const scheduledAt = new Date("2026-10-08T14:00:00Z");
const now = new Date("2026-10-06T10:00:00Z");
const free = new Date("2026-10-09T14:00:00Z");

const session = (over: Record<string, unknown> = {}) => ({
	id: "s2",
	checkpointId: "cp",
	index: 2,
	scheduledAt,
	endedAt: null,
	moveTo: null,
	moveAskedById: null,
	checkpoint: {
		status: "Active",
		curatorKind: "Human",
		curatorId: "curator",
		startedAt: new Date("2026-10-01T00:00:00Z"),
		project: { authorId: "author" },
	},
	...over,
});

beforeEach(() => {
	vi.clearAllMocks();
	sessionFind.mockResolvedValue(session());
	freeMoveSlots.mockResolvedValue([scheduledAt, free]);
});

describe("callMoveOptions", () => {
	it("offers the curator's free hours in days 8–10, never the hour it has", async () => {
		const result = await callMoveOptions("cp", 2, "author", now);
		expect(result).toMatchObject({
			ok: true,
			options: {
				days: [
					{ date: "2026-10-08", sprintDay: 1, slots: [] },
					{ date: "2026-10-09", sprintDay: 2, slots: [free.toISOString()] },
					{ date: "2026-10-10", sprintDay: 3, slots: [] },
				],
			},
		});
	});

	it("refuses a team member who is neither the author nor the curator", async () => {
		await expect(callMoveOptions("cp", 2, "oleg", now)).resolves.toEqual({
			ok: false,
			error: "notAllowed",
		});
	});

	it("refuses once the room has opened, and with the AI curator", async () => {
		await expect(
			callMoveOptions("cp", 2, "author", new Date("2026-10-08T13:50:00Z")),
		).resolves.toEqual({ ok: false, error: "notMovable" });
		sessionFind.mockResolvedValue(
			session({
				checkpoint: { ...session().checkpoint, curatorKind: "AI" },
			}),
		);
		await expect(callMoveOptions("cp", 2, "author", now)).resolves.toEqual({
			ok: false,
			error: "notMovable",
		});
	});
});

describe("askCallMove", () => {
	it("records the request and tells the other side", async () => {
		await expect(askCallMove("cp", 2, "author", free, now)).resolves.toEqual({
			ok: true,
		});
		expect(sessionUpdate).toHaveBeenCalledWith({
			where: { id: "s2" },
			data: { moveTo: free, moveAskedById: "author", moveAskedAt: now },
		});
		expect(notifyCallMove).toHaveBeenCalledWith("s2", "curator", {
			event: "asked",
			moveTo: free,
		});
	});

	it("refuses an hour that is not free", async () => {
		await expect(
			askCallMove("cp", 2, "author", new Date("2026-10-09T15:00:00Z"), now),
		).resolves.toEqual({ ok: false, error: "slotTaken" });
		expect(sessionUpdate).not.toHaveBeenCalled();
	});

	it("waits for the other side's request to be answered first", async () => {
		sessionFind.mockResolvedValue(
			session({ moveTo: free, moveAskedById: "curator" }),
		);
		await expect(askCallMove("cp", 2, "author", free, now)).resolves.toEqual({
			ok: false,
			error: "pendingFromOther",
		});
	});
});

describe("answerCallMove", () => {
	const asked = () =>
		sessionFind.mockResolvedValue(
			session({ moveTo: free, moveAskedById: "author" }),
		);

	it("moves only this call when the hour is still free, under the curator's lock", async () => {
		asked();
		await expect(answerCallMove("cp", 2, "curator", true, now)).resolves.toEqual(
			{ ok: true },
		);
		expect(lockCurator).toHaveBeenCalledWith(expect.anything(), "curator");
		expect(sessionUpdate).toHaveBeenCalledWith({
			where: { id: "s2" },
			data: {
				moveTo: null,
				moveAskedById: null,
				moveAskedAt: null,
				scheduledAt: free,
				rescheduledAt: now,
			},
		});
		expect(notifyCallMove).toHaveBeenCalledWith("s2", "author", {
			event: "approved",
			moveTo: free,
		});
	});

	it("drops the request and keeps the time when the hour was taken since", async () => {
		asked();
		freeMoveSlots.mockResolvedValue([]);
		await expect(answerCallMove("cp", 2, "curator", true, now)).resolves.toEqual(
			{ ok: false, error: "slotTaken" },
		);
		expect(sessionUpdate).toHaveBeenCalledWith({
			where: { id: "s2" },
			data: { moveTo: null, moveAskedById: null, moveAskedAt: null },
		});
	});

	it("lets only the other side answer", async () => {
		asked();
		await expect(answerCallMove("cp", 2, "author", true, now)).resolves.toEqual(
			{ ok: false, error: "notAllowed" },
		);
	});

	it("keeps the time on a no and tells the one who asked", async () => {
		asked();
		await answerCallMove("cp", 2, "curator", false, now);
		expect(notifyCallMove).toHaveBeenCalledWith("s2", "author", {
			event: "declined",
			moveTo: free,
		});
	});
});

describe("withdrawCallMove", () => {
	it("is the asker's alone", async () => {
		sessionFind.mockResolvedValue(
			session({ moveTo: free, moveAskedById: "author" }),
		);
		await expect(withdrawCallMove("cp", 2, "curator")).resolves.toEqual({
			ok: false,
			error: "nothingAsked",
		});
		await expect(withdrawCallMove("cp", 2, "author")).resolves.toEqual({
			ok: true,
		});
	});
});
