import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const checkpointFindUnique = vi.fn();
const checkpointUpdate = vi.fn();
const itemUpdate = vi.fn();
const itemCreateMany = vi.fn();
const getCheckpoint = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));

// Covered by space-guard.test.ts; mocked here so the assertions are about the
// scope change rather than about access resolution.
vi.mock("@/lib/space-guard", () => ({
	withSpaceGuard: () => (handler: unknown) => handler,
}));

vi.mock("@/repositories/checkpoint.repository", () => ({
	getCheckpoint: (...args: unknown[]) => getCheckpoint(...args),
	withProgress: <T>(checkpoint: T) => checkpoint,
}));

const tx = {
	checkpointItem: {
		update: (...args: unknown[]) => itemUpdate(...args),
		createMany: (...args: unknown[]) => itemCreateMany(...args),
	},
	projectCheckpoint: { update: (...args: unknown[]) => checkpointUpdate(...args) },
};

vi.mock("@/services/prisma", () => ({
	prisma: {
		projectCheckpoint: {
			findUnique: (...args: unknown[]) => checkpointFindUnique(...args),
		},
		$transaction: (run: (client: unknown) => unknown) => run(tx),
	},
}));

const author = { id: "u1", roles: ["Member"], onboardingDone: true };

/** Day 14 of a checkpoint that started 13 days ago. */
const startedAt = () => {
	const day1 = new Date();
	day1.setUTCDate(day1.getUTCDate() - 13);

	return day1;
};

const outcome = (id: string, order: number, over: Partial<Record<string, unknown>> = {}) => ({
	id,
	kind: "Outcome",
	order,
	text: `outcome ${order}`,
	originalText: null,
	...over,
});

const checkpoint = (over: Record<string, unknown> = {}) => ({
	status: "Active",
	startedAt: startedAt(),
	revisedAt: null,
	items: [
		{ id: "in1", kind: "Input", order: 1, text: "a build", originalText: null },
		outcome("out1", 1),
		outcome("out2", 2),
	],
	...over,
});

const post = async (body: unknown) => {
	const { POST } = await import("@/app/api/checkpoint/[id]/scope/route");
	const request = new NextRequest("http://localhost/api/checkpoint/cp1/scope", {
		method: "POST",
		body: JSON.stringify(body),
		headers: { "content-type": "application/json" },
	});

	return (POST as (r: NextRequest, c: unknown) => Promise<Response>)(request, {
		params: Promise.resolve({ id: "cp1" }),
	});
};

beforeEach(() => {
	vi.clearAllMocks();
	authMock.mockResolvedValue({ user: author });
	checkpointFindUnique.mockResolvedValue(checkpoint());
	itemUpdate.mockResolvedValue({});
	itemCreateMany.mockResolvedValue({ count: 1 });
	checkpointUpdate.mockResolvedValue({});
	getCheckpoint.mockResolvedValue({ id: "cp1", startedAt: startedAt() });
});

describe("POST /api/checkpoint/[id]/scope", () => {
	it("keeps the day-1 wording when a line is reworded", async () => {
		const response = await post({
			note: "Two tide states, not three",
			changes: [{ itemId: "out1", text: "two tide states" }],
		});

		expect(response.status).toBe(200);
		expect(itemUpdate).toHaveBeenCalledWith({
			where: { id: "out1" },
			data: { text: "two tide states", originalText: "outcome 1" },
		});
		expect(checkpointUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "cp1" },
				data: expect.objectContaining({
					revisedNote: "Two tide states, not three",
				}),
			}),
		);
	});

	it("does not overwrite originalText when the line was already reworded", async () => {
		checkpointFindUnique.mockResolvedValue(
			checkpoint({
				items: [
					outcome("out1", 1, {
						text: "two tide states",
						originalText: "three tide states",
					}),
				],
			}),
		);

		await post({
			note: "One is enough",
			changes: [{ itemId: "out1", text: "one tide state" }],
		});

		expect(itemUpdate).toHaveBeenCalledWith({
			where: { id: "out1" },
			data: { text: "one tide state" },
		});
	});

	it("leaves the text alone when a line is cut", async () => {
		await post({
			note: "It will not land in the days left",
			changes: [{ itemId: "out2", cut: true }],
		});

		expect(itemUpdate).toHaveBeenCalledWith({
			where: { id: "out2" },
			data: { cut: true },
		});
	});

	it("dates an added line and gives it the next order", async () => {
		const response = await post({
			note: "We are ahead",
			added: [{ text: "a third level" }],
		});

		expect(response.status).toBe(200);
		expect(itemCreateMany).toHaveBeenCalledWith({
			data: [
				expect.objectContaining({
					checkpointId: "cp1",
					kind: "Outcome",
					order: 3,
					text: "a third level",
					addedAt: expect.any(Date),
				}),
			],
		});
	});

	it("refuses an input id — the scope change touches outcomes only", async () => {
		const response = await post({
			note: "Trying to cut an input",
			changes: [{ itemId: "in1", cut: true }],
		});

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: "itemNotOutcome",
		});
		expect(itemUpdate).not.toHaveBeenCalled();
		expect(checkpointUpdate).not.toHaveBeenCalled();
	});

	it("refuses an id from another checkpoint", async () => {
		const response = await post({
			note: "Someone else's line",
			changes: [{ itemId: "other1", cut: true }],
		});

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: "itemNotInCheckpoint",
		});
	});

	it("refuses a checkpoint that has already been revised", async () => {
		checkpointFindUnique.mockResolvedValue(
			checkpoint({ revisedAt: new Date("2026-09-14") }),
		);

		const response = await post({
			note: "Second thoughts",
			changes: [{ itemId: "out1", cut: true }],
		});

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: "checkpointAlreadyRevised",
		});
		expect(itemUpdate).not.toHaveBeenCalled();
	});

	it("records the decision when the list is left as it is", async () => {
		const response = await post({ note: "The list stands", changes: [] });

		expect(response.status).toBe(200);
		expect(itemUpdate).not.toHaveBeenCalled();
		expect(itemCreateMany).not.toHaveBeenCalled();
		expect(checkpointUpdate).toHaveBeenCalledWith({
			where: { id: "cp1" },
			data: { revisedAt: expect.any(Date), revisedNote: "The list stands" },
		});
	});

	it("refuses before day 14 — there is nothing to answer yet", async () => {
		const day3 = new Date();
		day3.setUTCDate(day3.getUTCDate() - 2);
		checkpointFindUnique.mockResolvedValue(checkpoint({ startedAt: day3 }));

		const response = await post({ note: "Too soon" });

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: "scopeChangeTooEarly",
		});
	});

	it("refuses a checkpoint that is not running", async () => {
		checkpointFindUnique.mockResolvedValue(checkpoint({ status: "Draft" }));

		const response = await post({ note: "Not started" });

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: "checkpointNotActive",
		});
	});
});
