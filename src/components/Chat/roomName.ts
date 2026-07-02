import type { MatrixClient, Room } from "matrix-js-sdk";

// Matrix auto-names a 1:1 DM from "heroes" (the other members), but before the
// invitee joins there are no joined heroes, so the name falls back to "Empty
// room" (initiator side) or the canonical alias `#room-…` (invitee side). These
// are the placeholders we override with the counterpart's display name.
function isPlaceholderName(name?: string | null): boolean {
	if (!name) return true;
	if (name === "Empty room") return true;
	// canonical alias (#room-…) or raw room id (!…)
	return name.startsWith("#room-") || name.startsWith("!");
}

/**
 * Human-friendly room name for the sidebar/header. Prefers a real room name
 * (vacancy/advice chats set the project title); for Direct DMs with only a
 * placeholder, falls back to the other participant's display name.
 */
export function resolveRoomDisplayName(
	room: Room | null | undefined,
	client: MatrixClient | null | undefined,
): string {
	if (!room) return "";
	if (!isPlaceholderName(room.name)) return room.name;

	const myId = client?.getUserId();
	// Include invited members so the initiator sees the invitee's name before
	// they accept.
	const members = room.getMembers?.() ?? [];
	const other = members.find((m) => m.userId !== myId);
	const name = other?.name || other?.rawDisplayName;
	if (name && !name.startsWith("@")) return name;

	return "";
}
