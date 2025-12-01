import {
	type Conversation,
	Conversations,
	type ConversationsProps,
} from "@ant-design/x";
import { IconDoorExit } from "@tabler/icons-react";
import { Avatar, Badge, Flex, message, Skeleton } from "antd";
import { type Room, RoomEvent } from "matrix-js-sdk";
import { useEffect, useState } from "react";
import styles from "./ChatModal.module.scss";
import { useChat } from "./useChat";

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
	const [items, setItems] = useState<Conversation[]>([]);

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

					return {
						key: r.roomId,
						label: r.name,
						value: r.roomId,
						icon: (
							<Badge
								dot={true}
								color={userActive ? "green" : "red"}
								offset={[0, 28]}
							>
								<Avatar
									shape="square"
									src={fallbackMember?.getAvatarUrl(
										chatClient.baseUrl,
										24,
										24,
										"crop",
										true,
										true,
									)}
								/>
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
			items={items}
			menu={menuConfig}
			activeKey={selectedRoomId || undefined}
			onActiveChange={handleSelectRoom}
		/>
	);
}
