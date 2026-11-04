import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const checkpointFindUnique = vi.fn();
const roomFor = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));

vi.mock("@/services/prisma", () => ({
	prisma: {
		projectCheckpoint: {
			findUnique: (...a: unknown[]) => checkpointFindUnique(...a),
		},
	},
}));

vi.mock("@/services/chat/checkpoint-room", () => ({
	checkpointRoomFor: (...a: unknown[]) => roomFor(...a),
}));

const as = (id: string) =>
	authMock.mockResolvedValue({
		user: { id, roles: ["Member"], onboardingDone: true },
	});

const checkpoint = (over: Record<string, unknown> = {}) => ({
	status: "Active",
	curatorId: "curator",
	project: { team: { members: [] } },
	...over,
});

const open = async () => {
	const { POST } = await import("@/app/api/checkpoint/[id]/chat/route");
	const request = new NextRequest("http://localhost/api/checkpoint/cp1/chat", {
		method: "POST",
	});

	return (POST as (r: NextRequest, c: unknown) => Promise<Response>)(request, {
		params: Promise.resolve({ id: "cp1" }),
	});
};

beforeEach(() => {
	vi.clearAllMocks();
	roomFor.mockResolvedValue("!room:matrix");
});

describe("opening the checkpoint chat", () => {
	// The curator holds no role in the project space, so a guard keyed on it
	// would turn away the one person the room is for.
	it("lets in the curator who took it on", async () => {
		as("curator");
		checkpointFindUnique.mockResolvedValue(checkpoint());

		const response = await open();

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ roomId: "!room:matrix" });
	});

	it("lets in someone on the team", async () => {
		as("member");
		checkpointFindUnique.mockResolvedValue(
			checkpoint({ project: { team: { members: [{ id: "tm1" }] } } }),
		);

		expect((await open()).status).toBe(200);
	});

	it("keeps out anyone else", async () => {
		as("stranger");
		checkpointFindUnique.mockResolvedValue(checkpoint());

		expect((await open()).status).toBe(403);
		expect(roomFor).not.toHaveBeenCalled();
	});

	it("has no room before the curator's yes", async () => {
		as("curator");
		checkpointFindUnique.mockResolvedValue(
			checkpoint({ status: "AwaitingCurator" }),
		);

		expect((await open()).status).toBe(400);
	});
});
