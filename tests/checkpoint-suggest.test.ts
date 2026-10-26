import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const checkpointFindUnique = vi.fn();
const taskFindMany = vi.fn();
const lastClosedOutcomes = vi.fn();
const suggestLines = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));

// Covered by space-guard.test.ts; mocked here so the assertions are about what
// the suggestion is built from rather than about access resolution.
vi.mock("@/lib/space-guard", () => ({
	withSpaceGuard: () => (handler: unknown) => handler,
}));

vi.mock("@/repositories/checkpoint.repository", () => ({
	lastClosedOutcomes: (...args: unknown[]) => lastClosedOutcomes(...args),
}));

vi.mock("@/services/checkpoint-curator", () => ({
	checkpointCurator: {
		suggestLines: (...args: unknown[]) => suggestLines(...args),
	},
}));

vi.mock("@/services/prisma", () => ({
	prisma: {
		projectCheckpoint: {
			findUnique: (...args: unknown[]) => checkpointFindUnique(...args),
		},
		projectWorkflowStep: {
			findUnique: async (...args: unknown[]) => ({
				order: 2,
				projectWorkflowId: "wf1",
				tasks: await taskFindMany(...args),
			}),
			findFirst: async () => ({ name: "Demo" }),
		},
	},
}));

const author = {
	id: "u1",
	roles: ["Member"],
	onboardingDone: true,
	lang: "ru",
};

const checkpoint = (over: Record<string, unknown> = {}) => ({
	status: "Draft",
	goal: "A playable tide prototype",
	projectId: "p1",
	stageName: "Prototype",
	stepId: "step1",
	project: { name: "Tidebound", description: "A game about tides" },
	items: [
		{ id: "in1", kind: "Input", text: "a grey-box level", order: 1 },
		{ id: "out1", kind: "Outcome", text: "two tide states", order: 2 },
	],
	...over,
});

const post = async (body: unknown) => {
	const { POST } = await import("@/app/api/checkpoint/[id]/suggest/route");
	const request = new NextRequest(
		"http://localhost/api/checkpoint/cp1/suggest",
		{
			method: "POST",
			body: JSON.stringify(body),
			headers: { "content-type": "application/json" },
		},
	);

	return (POST as (r: NextRequest, c: unknown) => Promise<Response>)(request, {
		params: Promise.resolve({ id: "cp1" }),
	});
};

beforeEach(() => {
	vi.clearAllMocks();
	authMock.mockResolvedValue({ user: author });
	checkpointFindUnique.mockResolvedValue(checkpoint());
	taskFindMany.mockResolvedValue([{ name: "A vertical slice", done: false }]);
	lastClosedOutcomes.mockResolvedValue([{ text: "a tide shader" }]);
	suggestLines.mockResolvedValue({ lines: ["one", "two", "three"] });
});

describe("POST /api/checkpoint/[id]/suggest", () => {
	it("returns the curator's lines and stores nothing", async () => {
		const response = await post({ kind: "Outcome" });

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			lines: ["one", "two", "three"],
		});
	});

	it("asks for outcomes against the goal, the inputs and the stage", async () => {
		await post({ kind: "Outcome" });

		expect(suggestLines).toHaveBeenCalledWith(
			{
				kind: "Outcome",
				goal: "A playable tide prototype",
				inputs: ["a grey-box level"],
				workflow: {
					currentStage: "Prototype",
					nextStage: "Demo",
					description: null,
					requiredTasks: [{ name: "A vertical slice", done: false }],
				},
			},
			{ locale: "ru", checkpointId: "cp1" },
		);
		// The project is not the author's material for this side of the card.
		expect(lastClosedOutcomes).not.toHaveBeenCalled();
	});

	it("asks for inputs against the project and the last checkpoint's outcomes", async () => {
		await post({ kind: "Input" });

		expect(suggestLines).toHaveBeenCalledWith(
			{
				kind: "Input",
				project: { name: "Tidebound", description: "A game about tides" },
				workflow: {
					currentStage: "Prototype",
					nextStage: "Demo",
					description: null,
					requiredTasks: [{ name: "A vertical slice", done: false }],
				},
				previousOutcomes: ["a tide shader"],
			},
			{ locale: "ru", checkpointId: "cp1" },
		);
		expect(lastClosedOutcomes).toHaveBeenCalledWith("p1");
	});

	it("refuses a checkpoint that is no longer a draft", async () => {
		checkpointFindUnique.mockResolvedValue(checkpoint({ status: "Active" }));

		const response = await post({ kind: "Outcome" });

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toMatchObject({
			error: "checkpointNotDraft",
		});
		expect(suggestLines).not.toHaveBeenCalled();
	});

	it("answers 503 when the curator returns nothing", async () => {
		suggestLines.mockResolvedValue(null);

		const response = await post({ kind: "Outcome" });

		expect(response.status).toBe(503);
		await expect(response.json()).resolves.toMatchObject({
			error: "curatorUnavailable",
		});
	});

	it("refuses a kind that is not a side of the card", async () => {
		const response = await post({ kind: "Artifact" });

		expect(response.status).toBe(400);
		expect(suggestLines).not.toHaveBeenCalled();
	});
});
