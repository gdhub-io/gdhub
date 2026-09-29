import type { ChatRoomKind, ChatRoomStatus } from "@gdhub-io/gdhub-prisma";

export type ChatTab = "all" | "unread" | "closed";

/** One row of the chat list, flattened from the Matrix room and its registry meta. */
export type RoomSummary = {
	roomId: string;
	name: string;
	membership: "join" | "invite";
	kind: ChatRoomKind;
	status: ChatRoomStatus;
	label: string | null;
	lastTs: number;
	preview: string | null;
	previewIsOwn: boolean;
	unread: number;
};

export function roomsForTab(rooms: RoomSummary[], tab: ChatTab): RoomSummary[] {
	return rooms
		.filter((room) => {
			const closed = room.status === "Closed";
			if (tab === "closed") return closed;
			if (closed) return false;
			return tab === "all" || isUnread(room);
		})
		.sort((a, b) => b.lastTs - a.lastTs);
}

/** A pending invite is unread until it is answered. */
export function isUnread(room: RoomSummary): boolean {
	return room.unread > 0 || room.membership === "invite";
}

/** The Unread tab counts chats, not messages. */
export function unreadChatCount(rooms: RoomSummary[]): number {
	return roomsForTab(rooms, "unread").length;
}

/** Only rooms whose provider can close them, and only while open. */
export function canCloseFromList(room: RoomSummary): boolean {
	return (
		room.status === "Open" &&
		room.membership === "join" &&
		(room.kind === "AdviceRequest" || room.kind === "VacancyOffer")
	);
}
