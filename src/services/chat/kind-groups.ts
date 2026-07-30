import type { ChatRoomKind } from "@gdhub-io/gdhub-prisma";

// Drawer grouping for chat kinds. Client-safe (type-only prisma import).
// The Record over the enum forces a compile error when a new ChatRoomKind is
// added without deciding its drawer group.

export const GROUP_ORDER = ["experts", "positions", "direct"] as const;
export type ChatGroup = (typeof GROUP_ORDER)[number];

const KIND_GROUPS: Record<ChatRoomKind, ChatGroup> = {
	AdviceRequest: "experts",
	VacancyOffer: "positions",
	Direct: "direct",
	// Group-chat kinds get their own section when they ship (frontend-only).
	ProjectGroup: "direct",
	EventGroup: "direct",
	CourseGroup: "direct",
};

// Rooms unknown to the registry (e.g. legacy admin DMs) fall into Direct.
export function groupOfKind(kind?: string): ChatGroup {
	return KIND_GROUPS[kind as ChatRoomKind] ?? "direct";
}
