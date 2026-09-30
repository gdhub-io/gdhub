import {
	EventType,
	type MatrixClient,
	type MatrixEvent,
	NotificationCountType,
	type Room,
} from "matrix-js-sdk";
import type { ChatRoomMeta } from "@/types/chat";
import type { RoomSummary } from "./model/rooms";
import { resolveRoomDisplayName } from "./roomName";

function lastMessage(room: Room): MatrixEvent | undefined {
	const events = room.getLiveTimeline().getEvents();
	for (let i = events.length - 1; i >= 0; i--) {
		const event = events[i];
		if (event.getType() !== EventType.RoomMessage) continue;
		// An edit is shown through the event it replaces.
		if (event.isRelation("m.replace")) continue;
		return event;
	}
	return undefined;
}

/** Flatten a synced room and its registry meta into one list row. */
export function summarizeRoom(
	room: Room,
	client: MatrixClient,
	meta: ChatRoomMeta | undefined,
): RoomSummary {
	const myId = client.getUserId();
	const last = lastMessage(room);
	const fallbackMember = room.getAvatarFallbackMember();
	const user = fallbackMember?.user;
	const activity = room.getLastActiveTimestamp();

	return {
		roomId: room.roomId,
		name: resolveRoomDisplayName(room, client) || room.name,
		avatarMxc:
			room.getMxcAvatarUrl() || fallbackMember?.getMxcAvatarUrl() || null,
		online: !!user && (user.currentlyActive || user.presence === "online"),
		membership: room.getMyMembership() === "invite" ? "invite" : "join",
		kind: meta?.kind ?? "Direct",
		status: meta?.status ?? "Open",
		label: meta?.label ?? null,
		lastTs: last?.getTs() ?? (activity > 0 ? activity : 0),
		preview: last ? String(last.getContent().body ?? "") : null,
		previewIsOwn: !!last && last.getSender() === myId,
		previewDeleted: !!last?.isRedacted(),
		unread: room.getUnreadNotificationCount(NotificationCountType.Total) || 0,
	};
}

/**
 * Read receipt and fully-read marker up to the latest event. A no-op once it
 * is read: sending a receipt emits a local `Room.receipt` at once, so a caller
 * that re-runs on receipts would otherwise loop.
 */
export async function markRoomRead(
	client: MatrixClient,
	roomId: string,
): Promise<void> {
	const room = client.getRoom(roomId);
	const events = room?.getLiveTimeline().getEvents() ?? [];
	const latest = [...events].reverse().find((event) => !!event.getId());
	const latestId = latest?.getId();
	const myId = client.getUserId();
	if (!room || !latest || !latestId || !myId) return;
	if (room.hasUserReadEvent(myId, latestId)) return;
	await Promise.allSettled([
		client.sendReadReceipt(latest),
		client.setRoomReadMarkers(roomId, latestId, latest),
	]);
}
