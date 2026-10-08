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

vi.mock("../src/services/chat/ensure-room", () => ({ ensureChatRoom: vi.fn() }));

import {
	addToCheckpointRooms,
	closeCheckpointRoom,
	removeFromCheckpointRooms,
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

	it("invites a new member through the curator and records them", async () => {
		vi.mocked(prisma.chatRoom.findMany).mockResolvedValue([
			room(["curator", "author"]),
		] as never);

		await addToCheckpointRooms("p1", "newbie");

		expect(inviteUserToRoom).toHaveBeenCalledWith("curator", "!room", "newbie");
		expect(writtenUserIds()).toEqual(["curator", "author", "newbie"]);
	});

	it("does not invite someone already in the chat", async () => {
		vi.mocked(prisma.chatRoom.findMany).mockResolvedValue([
			room(["curator", "author"]),
		] as never);

		await addToCheckpointRooms("p1", "author");

		expect(inviteUserToRoom).not.toHaveBeenCalled();
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
