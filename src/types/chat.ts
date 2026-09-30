import type { ChatRoomKind, ChatRoomStatus } from "@gdhub-io/gdhub-prisma";

export type MatrixChatSessionResponse = {
	userId: string;
	token: string;
	deviceId: string;
};

/** What the browser needs to build a Matrix client. */
export type MatrixSession = {
	accessToken?: string;
	userId?: string;
	deviceId?: string;
};

/** Registry facts about one room the chat list cannot get from Matrix. */
export type ChatRoomMeta = {
	kind: ChatRoomKind;
	status: ChatRoomStatus;
	label: string | null;
	closedAt: string | null;
};
