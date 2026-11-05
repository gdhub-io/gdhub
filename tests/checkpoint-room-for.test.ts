import { beforeEach, describe, expect, it, vi } from "vitest";

const chatRoomFindUnique = vi.fn();
const checkpointFindUnique = vi.fn();
const ensureChatRoom = vi.fn();
const inviteUserToRoom = vi.fn();

vi.mock("@/services/prisma", () => ({
	prisma: {
		chatRoom: {
			findUnique: (...a: unknown[]) => chatRoomFindUnique(...a),
			update: vi.fn(),
		},
		projectCheckpoint: {
			findUnique: (...a: unknown[]) => checkpointFindUnique(...a),
		},
	},
}));
vi.mock("@/services/chat/ensure-room", () => ({
	ensureChatRoom: (...a: unknown[]) => ensureChatRoom(...a),
}));
vi.mock("@/services/chat/auto-join", () => ({
	autoJoinRoom: vi.fn(),
}));
vi.mock("@/services/matrix/admin", () => ({
	inviteUserToRoom: (...a: unknown[]) => inviteUserToRoom(...a),
	kickUserFromRoom: vi.fn(),
	makeRoomReadOnly: vi.fn(),
}));
vi.mock("@/repositories/checkpoints/number", () => ({
	checkpointNumber: vi.fn().mockResolvedValue(1),
}));

const { checkpointRoomFor } = await import("@/services/chat/checkpoint-room");

beforeEach(() => vi.clearAllMocks());

describe("checkpointRoomFor", () => {
	it("answers from the room row alone when the room exists", async () => {
		chatRoomFindUnique.mockResolvedValue({
			id: "r1",
			matrixRoomId: "!m:x",
			context: { userIds: ["curator", "u1"] },
		});

		await expect(checkpointRoomFor("cp1", "u1")).resolves.toBe("!m:x");
		expect(chatRoomFindUnique).toHaveBeenCalledTimes(1);
		expect(checkpointFindUnique).not.toHaveBeenCalled();
		expect(inviteUserToRoom).not.toHaveBeenCalled();
	});

	it("still lets in someone the room does not list yet", async () => {
		chatRoomFindUnique.mockResolvedValue({
			id: "r1",
			matrixRoomId: "!m:x",
			context: { userIds: ["curator"] },
		});

		await checkpointRoomFor("cp1", "u2");
		expect(inviteUserToRoom).toHaveBeenCalledWith("curator", "!m:x", "u2");
	});

	it("makes the room when the start could not", async () => {
		chatRoomFindUnique
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce({ context: { userIds: ["curator", "u1"] } });
		checkpointFindUnique.mockResolvedValue({
			curatorId: "curator",
			projectId: "p1",
			createdAt: new Date(),
			project: { name: "P", coverImage: null, team: { members: [] } },
		});
		ensureChatRoom.mockResolvedValue({ chatRoomId: "r1", roomId: "!new:x" });

		await expect(checkpointRoomFor("cp1", "u1")).resolves.toBe("!new:x");
		expect(ensureChatRoom).toHaveBeenCalledOnce();
	});
});
