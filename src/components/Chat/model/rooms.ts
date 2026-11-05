import type { ChatRoomKind, ChatRoomStatus } from "@gdhub-io/gdhub-prisma";

export type ChatTab = "all" | "unread" | "closed";

/** One row of the chat list, flattened from the Matrix room and its registry meta. */
export type RoomSummary = {
	roomId: string;
	name: string;
	avatarMxc: string | null;
	online: boolean;
	membership: "join" | "invite";
	kind: ChatRoomKind;
	status: ChatRoomStatus;
	label: string | null;
	lastTs: number;
	/** Plain text of the last message; null when there is none yet. */
	preview: string | null;
	previewIsOwn: boolean;
	previewDeleted: boolean;
	unread: number;
	/** Notifications off through the user's push rule; the row still lists. */
	muted: boolean;
};

export function roomsForTab(rooms: RoomSummary[], tab: ChatTab): RoomSummary[] {
	return rooms
		.filter((room) => {
			const closed = room.status === "Closed";
			if (tab === "closed") return closed;
			if (closed) return false;
			return tab === "all" || isUnread(room);
		})
		.sort(compareRooms);
}

/** Announcements is pinned to the top; the rest by recency. */
export function isPinned(room: Pick<RoomSummary, "kind">): boolean {
	return room.kind === "Announcements";
}

export function compareRooms(a: RoomSummary, b: RoomSummary): number {
	const pinned = Number(isPinned(b)) - Number(isPinned(a));
	return pinned || b.lastTs - a.lastTs;
}

/** A pending invite is unread until it is answered. */
export function isUnread(room: RoomSummary): boolean {
	return room.unread > 0 || room.membership === "invite";
}

/** The Unread tab counts chats, not messages. */
export function unreadChatCount(rooms: RoomSummary[]): number {
	return roomsForTab(rooms, "unread").length;
}

/**
 * The header launcher: unread messages, an unanswered invite as one. Muted
 * rooms stay out, so a muted chat never lights the dot.
 */
export function launcherUnreadCount(
	rooms: { invite: boolean; unread: number; muted: boolean }[],
): number {
	return rooms.reduce((total, room) => {
		if (room.muted) return total;
		if (room.invite) return total + 1;
		return total + (Number.isFinite(room.unread) ? room.unread : 0);
	}, 0);
}

/** Only rooms whose provider can close them, and only while open. */
export function canCloseFromList(room: RoomSummary): boolean {
	return (
		room.status === "Open" &&
		room.membership === "join" &&
		(room.kind === "AdviceRequest" || room.kind === "VacancyOffer")
	);
}
