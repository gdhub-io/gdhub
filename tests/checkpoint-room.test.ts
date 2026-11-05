import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/services/prisma";

vi.mock("../src/services/prisma", () => ({
	prisma: {
		chatRoom: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
	},
}));

vi.mock("../src/services/matrix/admin", () => ({
	inviteUserToRoom: vi.fn(),
	kickUserFromRoom: vi.fn(),
	makeRoomReadOnly: vi.fn(),
}));

const currentMembership = vi.fn();
vi.mock("../src/repositories/project/team", () => ({
	currentMembership: (...a: unknown[]) => currentMembership(...a),
}));

vi.mock("../src/services/chat/ensure-room", () => ({
	ensureChatRoom: vi.fn(),
}));
vi.mock("../src/services/chat/auto-join", () => ({
	autoJoinRoom: vi.fn(),
}));

import { autoJoinRoom } from "../src/services/chat/auto-join";
import {
	closeCheckpointRoom,
	reconcileCheckpointRooms,
} from "../src/services/chat/checkpoint-room";
import {
	inviteUserToRoom,
	kickUserFromRoom,
	makeRoomReadOnly,
} from "../src/services/matrix/admin";

const room = (userIds: string[]) => ({
	id: "cr1",
	matrixRoomId: "!room",
	context: { checkpointId: "cp1", projectId: "p1", userIds },
});

const writtenUserIds = () =>
	(prisma.chatRoom.update as ReturnType<typeof vi.fn>).mock.calls[0][0].data
		.context.userIds;

const onTeam = { id: "tm1" };
const addToCheckpointRooms = (projectId: string, userId: string) => {
	currentMembership.mockResolvedValue(onTeam);
	return reconcileCheckpointRooms(projectId, userId);
};
const removeFromCheckpointRooms = (projectId: string, userId: string) => {
	currentMembership.mockResolvedValue(null);
	return reconcileCheckpointRooms(projectId, userId);
};

beforeEach(() => {
	vi.clearAllMocks();
});

describe("checkpoint chat follows the team", () => {
	it("looks only at the project's open checkpoint chats", async () => {
		vi.mocked(prisma.chatRoom.findMany).mockResolvedValue([]);

		await addToCheckpointRooms("p1", "u2");

		expect(prisma.chatRoom.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					kind: "Checkpoint",
					status: "Open",
					context: { path: ["projectId"], equals: "p1" },
				}),
			}),
		);
	});

	it("invites a new member through the curator, joins them and records them", async () => {
		vi.mocked(prisma.chatRoom.findMany).mockResolvedValue([
			room(["curator", "author"]),
		] as never);

		await addToCheckpointRooms("p1", "newbie");

		expect(inviteUserToRoom).toHaveBeenCalledWith("curator", "!room", "newbie");
		// The team at the start never saw an invite screen; a newcomer does not either.
		expect(autoJoinRoom).toHaveBeenCalledWith("!room", "newbie");
		expect(writtenUserIds()).toEqual(["curator", "author", "newbie"]);
	});

	it("does not invite someone already in the chat", async () => {
		vi.mocked(prisma.chatRoom.findMany).mockResolvedValue([
			room(["curator", "author"]),
		] as never);

		await addToCheckpointRooms("p1", "author");

		expect(inviteUserToRoom).not.toHaveBeenCalled();
		expect(autoJoinRoom).not.toHaveBeenCalled();
		expect(prisma.chatRoom.update).not.toHaveBeenCalled();
	});

	it("removes a member who left, from the registry and from Matrix", async () => {
		vi.mocked(prisma.chatRoom.findMany).mockResolvedValue([
			room(["curator", "author", "leaver"]),
		] as never);

		await removeFromCheckpointRooms("p1", "leaver");

		expect(writtenUserIds()).toEqual(["curator", "author"]);
		expect(kickUserFromRoom).toHaveBeenCalledWith("curator", "!room", "leaver");
	});

	it("asks whether the user is on the team now, not what the route did", async () => {
		vi.mocked(prisma.chatRoom.findMany).mockResolvedValue([
			room(["curator", "author", "member"]),
		] as never);

		// A withdrawn old application while a current Hired row stands.
		await addToCheckpointRooms("p1", "member");

		expect(currentMembership).toHaveBeenCalledWith("member", { projectId: "p1" });
		expect(kickUserFromRoom).not.toHaveBeenCalled();
		expect(prisma.chatRoom.update).not.toHaveBeenCalled();
	});

	it("never removes the curator on a team change", async () => {
		vi.mocked(prisma.chatRoom.findMany).mockResolvedValue([
			room(["curator", "author"]),
		] as never);

		await removeFromCheckpointRooms("p1", "curator");

		expect(kickUserFromRoom).not.toHaveBeenCalled();
		expect(prisma.chatRoom.update).not.toHaveBeenCalled();
	});
});

describe("closeCheckpointRoom", () => {
	it("closes the chat and freezes it", async () => {
		vi.mocked(prisma.chatRoom.findUnique).mockResolvedValue({
			id: "cr1",
			status: "Open",
			matrixRoomId: "!room",
		} as never);

		await closeCheckpointRoom("cp1");

		expect(prisma.chatRoom.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({ where: { directKey: "checkpoint:cp1" } }),
		);
		expect(
			vi.mocked(prisma.chatRoom.update).mock.calls[0][0].data,
		).toMatchObject({ status: "Closed" });
		expect(makeRoomReadOnly).toHaveBeenCalledWith("!room");
	});

	it("leaves an already closed chat alone", async () => {
		vi.mocked(prisma.chatRoom.findUnique).mockResolvedValue({
			id: "cr1",
			status: "Closed",
			matrixRoomId: "!room",
		} as never);

		await closeCheckpointRoom("cp1");

		expect(prisma.chatRoom.update).not.toHaveBeenCalled();
		expect(makeRoomReadOnly).not.toHaveBeenCalled();
	});
});
