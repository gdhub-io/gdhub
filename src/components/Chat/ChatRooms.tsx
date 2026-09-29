import { Conversations, type ConversationsProps } from "@ant-design/x";
import type { ConversationItemType } from "@ant-design/x/es/conversations/interface";

// TODO(antd6): @ant-design/x v2 removed the top-level `Conversation` item type
// export. Use `ConversationItemType` (the non-divider item) extended with the
// custom `value` field this codebase relies on.
type Conversation = ConversationItemType & { value: string };

import { IconDoorExit } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Badge, Flex, message, Skeleton } from "antd";
import axios from "axios";
import { type Room, RoomEvent } from "matrix-js-sdk";
import { useEffect, useMemo, useState } from "react";
import {
	type ChatGroup,
	GROUP_ORDER,
	groupOfKind,
} from "@/services/chat/kind-groups";
import type { ChatRoomMeta } from "@/types/chat";
import styles from "./ChatModal.module.scss";
import { MatrixAvatar } from "./MatrixAvatar";
import { resolveRoomDisplayName } from "./roomName";
import { useChat } from "./useChat";

// Room ids per request — keeps the GET URL far below header limits.
const KINDS_CHUNK = 100;

export default function ChatRooms({
	onReady,
}: {
	onReady: (data: { count: number }) => void;
}) {
	const {
		selectedRoomId,
		setSelectedRoomId,
		setUserMembership,
		chatClient,
		ready,
	} = useChat();
	const { t } = useTranslate();
	const [items, setItems] = useState<Conversation[]>([]);

	const roomIds = useMemo(() => items.map((i) => i.value).sort(), [items]);

	// matrixRoomId -> registry meta, batched: unbounded id
	// lists would overflow the URL/header limit on large accounts.
	const { data: roomMeta } = useQuery({
		queryKey: ["chat-room-meta", roomIds.join(",")],
		queryFn: async () => {
			const chunks: string[][] = [];
			for (let i = 0; i < roomIds.length; i += KINDS_CHUNK) {
				chunks.push(roomIds.slice(i, i + KINDS_CHUNK));
			}
			const results = await Promise.all(
				chunks.map((chunk) =>
					axios
						.get<Record<string, ChatRoomMeta>>("/api/chat/rooms/meta", {
							params: { matrixRoomIds: chunk.join(",") },
						})
						.then((res) => res.data),
				),
			);
			return Object.assign({}, ...results) as Record<string, ChatRoomMeta>;
		},
		enabled: roomIds.length > 0,
		staleTime: 60_000,
	});

	const groupLabels: Record<ChatGroup, string> = {
		experts: t("chat.groups.experts", "Experts"),
		positions: t("chat.groups.offers", "Offers"),
		direct: t("chat.groups.direct", "Direct chats"),
	};

	// Attach groups only once the mapping is loaded — an ungrouped flat list is
	// better than everything flashing into "Direct" and re-sorting. Group order
	// follows item order, so sort by GROUP_ORDER (stable — keeps recency inside
	// each group).
	const groupedItems = useMemo(() => {
		if (!roomMeta) return items;
		return items
			.map((item) => ({
				...item,
				group: groupOfKind(roomMeta[item.value]?.kind),
			}))
			.sort(
				(a, b) =>
					GROUP_ORDER.indexOf(a.group as ChatGroup) -
					GROUP_ORDER.indexOf(b.group as ChatGroup),
			);
	}, [items, roomMeta]);

	useEffect(() => {
		if (!chatClient || !ready) {
			return;
		}

		const mapRoomsToItems = (rooms: Room[]): Conversation[] =>
			rooms
				.filter((r) => ["join", "invite"].includes(r.getMyMembership()))
				.map((r) => {
					const fallbackMember = r.getAvatarFallbackMember();
					const userActive = fallbackMember?.user?.currentlyActive;
					// Prefer the room avatar (mxc), else the DM counterpart's avatar.
					const roomMxc =
						r.getMxcAvatarUrl() ||
						fallbackMember?.getMxcAvatarUrl() ||
						undefined;

					return {
						key: r.roomId,
						label: resolveRoomDisplayName(r, chatClient) || r.name,
						value: r.roomId,
						icon: (
							<Badge
								dot={true}
								color={userActive ? "green" : "red"}
								offset={[0, 28]}
							>
								<MatrixAvatar shape="square" size={24} mxcUrl={roomMxc} />
							</Badge>
						),
					};
				});

		const refreshRooms = () => {
			const nextItems = mapRoomsToItems(chatClient.getRooms() || []);
			setItems(nextItems);
			try {
				onReady({ count: nextItems.length });
				const { setUserMembership, setSelectedRoomId } = useChat.getState();
				if (nextItems.length === 0) {
					// clear selection when no rooms remain
					setSelectedRoomId("");
					setUserMembership(null);
				}
			} catch {}
		};

		refreshRooms();

		const onMembership = (room: Room) => {
			refreshRooms();
			try {
				const { setUserMembership, selectedRoomId } = useChat.getState();
				if (selectedRoomId && room?.roomId === selectedRoomId) {
					setUserMembership(room.getMyMembership() || null);
				}
			} catch {}
		};
		const onTimelineReset = () => refreshRooms();
		const onPresenceChange = () => refreshRooms();

		chatClient.on(RoomEvent.MyMembership, onMembership);
		chatClient.on(RoomEvent.TimelineReset as any, onTimelineReset);
		// presence-related updates
		chatClient.on("User.presence" as any, onPresenceChange);
		chatClient.on("User.currentlyActive" as any, onPresenceChange);
		chatClient.on("User.lastPresenceTs" as any, onPresenceChange);

		// periodic refresh for DM counterparts
		const presenceInterval = setInterval(async () => {
			try {
				const rooms = (chatClient.getRooms() || []).filter((r) =>
					["join", "invite"].includes(r.getMyMembership()),
				);
				for (const r of rooms) {
					// best-effort: consider DM if only two joined members
					const isDm = r.getJoinedMemberCount() <= 2;
					if (!isDm) continue;
					const fallbackMember = r.getAvatarFallbackMember();
					const userId = fallbackMember?.user?.userId;
					if (userId && userId !== chatClient.getUserId()) {
						await chatClient.getPresence(userId).catch(() => {});
					}
				}
				onPresenceChange();
			} catch {}
		}, 60_000);

		onReady({ count: mapRoomsToItems(chatClient.getRooms() || []).length });

		return () => {
			chatClient.removeListener(RoomEvent.MyMembership, onMembership);
			chatClient.removeListener(
				RoomEvent.TimelineReset as any,
				onTimelineReset,
			);
			chatClient.removeListener("User.presence" as any, onPresenceChange);
			chatClient.removeListener(
				"User.currentlyActive" as any,
				onPresenceChange,
			);
			chatClient.removeListener("User.lastPresenceTs" as any, onPresenceChange);
			clearInterval(presenceInterval);
		};
	}, [chatClient, ready]);

	useEffect(() => {
		if (items.length === 0) return;
		if (!selectedRoomId) {
			handleSelectRoom(items[0].key);
			return;
		}

		const exists = items.some((i) => i.key === selectedRoomId);
		if (!exists) handleSelectRoom(items[0].key);

		const room = chatClient?.getRoom(selectedRoomId);
		setUserMembership(room?.getMyMembership() || null);
	}, [items, selectedRoomId]);

	const menuConfig: ConversationsProps["menu"] = (conversation) => {
		const member = chatClient
			?.getRoom(conversation.value)
			?.getMember(chatClient?.getUserId() || "");

		// if user is not a member of the room, return undefined
		if (member?.membership !== "join") return undefined;

		return {
			items: [
				{ label: "Leave", key: "leave", icon: <IconDoorExit />, danger: true },
			],
			onClick: async (menuInfo) => {
				menuInfo.domEvent.stopPropagation();

				if (menuInfo.key === "leave") {
					await chatClient?.leave(conversation.value);
					message.info(`You left ${conversation.label} room`);

					setItems((prev) =>
						prev.filter((i) => i.value !== conversation.value),
					);
				}
			},
		};
	};

	if (items.length === 0) {
		return (
			<Flex vertical gap={8} style={{ width: "100%", padding: "16px" }}>
				<Skeleton.Button active={!ready} className={styles.chatRoomsSkeleton} />
				<Skeleton.Button active={!ready} className={styles.chatRoomsSkeleton} />
				<Skeleton.Button active={!ready} className={styles.chatRoomsSkeleton} />
				<Skeleton.Button active={!ready} className={styles.chatRoomsSkeleton} />
			</Flex>
		);
	}

	const handleSelectRoom = (key: string) => {
		setSelectedRoomId(key);

		const room = chatClient?.getRoom(key);

		if (room) {
			setUserMembership(room.getMyMembership() || null);
		}
	};

	return (
		<Conversations
			items={groupedItems}
			groupable={
				roomMeta
					? {
							label: (group: string) =>
								groupLabels[group as ChatGroup] ?? group,
						}
					: undefined
			}
			menu={menuConfig}
			activeKey={selectedRoomId || undefined}
			onActiveChange={handleSelectRoom}
		/>
	);
}
