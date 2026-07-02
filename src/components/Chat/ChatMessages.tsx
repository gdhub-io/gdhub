import { UserOutlined } from "@ant-design/icons";
import { Bubble, type BubbleProps } from "@ant-design/x";
import type { BubbleItemType } from "@ant-design/x/es/bubble/interface";
import {
	IconAlertCircle,
	IconCheck,
	IconChecks,
	IconClock,
} from "@tabler/icons-react";
import { Flex, type GetRef } from "antd";
import dayjs from "dayjs";
import {
	EventStatus,
	EventTimeline,
	type MatrixEvent,
	type Room,
	RoomEvent,
} from "matrix-js-sdk";
import {
	type UIEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import styles from "./ChatModal.module.scss";
import { MatrixAvatar } from "./MatrixAvatar";
import DefaultInvite from "./special-messages/DefaultInvite";
import VacancyChatInvite from "./special-messages/VacancyChatInvite";
import { useChat } from "./useChat";

type MessageStatus = "sending" | "sent" | "read" | "failed";

type MessageExtra = {
	title?: string;
	/** Raw mxc:// avatar — resolved via authenticated media by MatrixAvatar. */
	avatarMxc?: string;
	time?: string;
	systemText?: string;
	status?: MessageStatus;
};

type MessageBubble = BubbleItemType & { extraInfo?: MessageExtra };

type MessageEventContent = {
	body?: string;
	formatted_body?: string;
	displayname?: string;
	membership?: string;
	name?: string;
	[key: string]: unknown;
};

const availableMessageTypes = [
	"m.room.message",
	"m.room.name",
	"m.room.topic",
	"m.room.create",
	"m.room.redaction",
	"m.room.member",
];

const RenderIndex: BubbleProps["contentRender"] = (content) => (
	<Flex style={{ whiteSpace: "pre-line", wordBreak: "break-word" }}>
		{content}
	</Flex>
);

// delivery status indicator for our own messages (Matrix has no "delivered"
// receipt, so we only surface sending / sent / read / failed)
const renderMessageStatus = (status?: MessageStatus) => {
	switch (status) {
		case "sending":
			return <IconClock size={13} color="#cccccc" />;
		case "sent":
			return <IconCheck size={13} color="#9c9a9a" />;
		case "read":
			return <IconChecks size={13} color="#4096ff" />;
		case "failed":
			return <IconAlertCircle size={13} color="#ff4d4f" />;
		default:
			return null;
	}
};

export default function ChatMessages() {
	const listRef = useRef<GetRef<typeof Bubble.List>>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const shouldStickToBottomRef = useRef(true);
	const lastMarkedEventIdRef = useRef<string | null>(null);
	const {
		selectedRoomId,
		chatClient,
		ready,
		userMembership,
		chatContext,
		openChatModal,
	} = useChat();
	const [messages, setMessages] = useState<MatrixEvent[]>([]);
	const [preparedMessages, setPreparedMessages] = useState<MessageBubble[]>([]);
	const [isPaginating, setIsPaginating] = useState(false);
	const [canPaginateBackwards, setCanPaginateBackwards] = useState(false);

	// const queryClient = useQueryClient()

	// const { data: messages } = useQuery({
	// 	queryKey: ['chat-messages', selectedRoomId],
	// 	queryFn: () => axios.get<any[]>(`/api/chat/rooms/${selectedRoomId}/messages`).then((res) => res.data),
	// 	enabled: !!selectedRoomId,
	// })

	// const { data: rooms } = useQuery({
	// 	queryKey: ['chat-rooms', chatSession?.userId],
	// 	queryFn: async () => axios.get<any[]>(`/api/chat/rooms`).then((res) => res.data),
	// 	enabled: !!chatSession?.userId,
	// })

	const computeBackwardsAvailability = useCallback(
		(timeline?: EventTimeline | null) => {
			if (!timeline) return false;
			const hasToken = !!timeline.getPaginationToken(EventTimeline.BACKWARDS);
			const hasNeighbour = !!timeline.getNeighbouringTimeline(
				EventTimeline.BACKWARDS,
			);
			return hasToken || hasNeighbour;
		},
		[],
	);

	const syncRoomMessages = useCallback(
		(room: Room | null) => {
			if (!room) {
				setMessages([]);
				setCanPaginateBackwards(false);
				return;
			}
			const timeline = room.getLiveTimeline();
			const events = timeline.getEvents() || [];
			setMessages([...events]);
			setCanPaginateBackwards(computeBackwardsAvailability(timeline));
		},
		[computeBackwardsAvailability],
	);

	const paginateBackwards = useCallback(async () => {
		if (!chatClient || !selectedRoomId) return;
		const room = chatClient.getRoom(selectedRoomId);
		if (!room) return;
		const timeline = room.getLiveTimeline();
		if (!computeBackwardsAvailability(timeline) || isPaginating) {
			return;
		}

		setIsPaginating(true);
		const container = scrollContainerRef.current;
		const prevHeight = container?.scrollHeight ?? 0;
		const prevScrollTop = container?.scrollTop ?? 0;

		try {
			await chatClient.paginateEventTimeline(timeline, {
				backwards: true,
				limit: 30,
			});
			syncRoomMessages(room);
		} catch (error) {
			console.error("[chat] paginate error", error);
		} finally {
			requestAnimationFrame(() => {
				if (container) {
					const nextHeight = container.scrollHeight;
					const diff = nextHeight - prevHeight;
					container.scrollTop = prevScrollTop + diff;
				}
				setIsPaginating(false);
			});
		}
	}, [
		chatClient,
		computeBackwardsAvailability,
		isPaginating,
		selectedRoomId,
		syncRoomMessages,
	]);

	useEffect(() => {
		if (!chatClient || !ready || !selectedRoomId) return;

		const room = chatClient.getRoom(selectedRoomId);
		syncRoomMessages(room);

		const handleTimeline = (
			_event: MatrixEvent,
			evRoom?: Room,
			toStartOfTimeline?: boolean,
		) => {
			if (toStartOfTimeline) return;
			if (!evRoom || evRoom.roomId !== selectedRoomId) return;
			syncRoomMessages(evRoom);
		};

		// read receipts arrive on a separate event — recompute so the
		// sent/read status on our own messages updates in real time
		const handleReceipt = (_event: MatrixEvent, evRoom?: Room) => {
			if (!evRoom || evRoom.roomId !== selectedRoomId) return;
			syncRoomMessages(evRoom);
		};

		chatClient.on(RoomEvent.Timeline, handleTimeline);
		chatClient.on(RoomEvent.Receipt, handleReceipt);
		return () => {
			chatClient.removeListener(RoomEvent.Timeline, handleTimeline);
			chatClient.removeListener(RoomEvent.Receipt, handleReceipt);
		};
	}, [chatClient, ready, selectedRoomId, syncRoomMessages]);

	useEffect(() => {
		shouldStickToBottomRef.current = true;
		if (!selectedRoomId) {
			scrollContainerRef.current?.scrollTo?.({
				top: 0,
			});
		}
	}, [selectedRoomId]);

	useEffect(() => {
		if (isPaginating) return;
		if (!shouldStickToBottomRef.current) return;
		if (!preparedMessages.length) return;

		requestAnimationFrame(() => {
			try {
				listRef.current?.scrollTo?.({ top: "bottom" });
				const container = scrollContainerRef.current;
				if (container) {
					container.scrollTop = container.scrollHeight;
				}
			} catch {}
		});
	}, [preparedMessages, isPaginating]);

	const currentRoom = useMemo(
		() =>
			selectedRoomId ? (chatClient?.getRoom(selectedRoomId) ?? null) : null,
		[chatClient, selectedRoomId],
	);

	const buildSystemHeader = useCallback(
		(ev: MatrixEvent): string => {
			const type = ev.getType();
			const senderId = ev.getSender();
			const content = (ev.getContent() || {}) as MessageEventContent;
			const userDisplay =
				chatClient?.getUser(senderId || "")?.displayName || "Unknown";
			const invitedDisplay = content.displayname || "User";

			switch (type) {
				case "m.room.member": {
					const membership = content.membership;
					if (membership === "join") return `${userDisplay} joined the room`;
					if (membership === "leave") return `${userDisplay} left the room`;
					if (membership === "invite") return `${invitedDisplay} was invited`;
					if (membership === "ban") return `${userDisplay} was banned`;
					return `${userDisplay} membership changed`;
				}
				case "m.room.name":
					return `Room name changed to "${content?.name || ""}"`;
				case "m.room.topic":
					return `Room topic updated`;
				case "m.room.create":
					return `Room created by ${userDisplay}`;
				case "m.room.redaction":
					return `An event was redacted`;
				case "m.room.power_levels":
					return `Power levels updated`;
				default:
					return `Event: ${type}`;
			}
		},
		[chatClient],
	);

	useEffect(() => {
		if (!Array.isArray(messages)) return;
		setPreparedMessages(
			messages
				.filter(
					(ev) =>
						availableMessageTypes.includes(ev.getType()) &&
						!ev.isRelation?.("m.replace"),
				)
				.map((ev) => {
					const type = ev.getType();
					const senderId = ev.getSender();
					const time = dayjs(ev.getTs()).format("HH:mm");
					const key = ev.getId() || `${ev.getTs()}-${Math.random()}`;

					if (type === "m.room.message") {
						const content = (ev.getContent() || {}) as MessageEventContent;
						const text =
							content.body || content.formatted_body || JSON.stringify(content);
						const chatUser = chatClient?.getUser(senderId || "");
						const member = currentRoom?.getMember(senderId || "");
						// Keep the raw mxc — MatrixAvatar loads it via authenticated media.
						const avatarMxc =
							member?.getMxcAvatarUrl() || chatUser?.avatarUrl || undefined;
						const displayName = member?.name || chatUser?.displayName;
						const edited = !!ev.replacingEventId?.();
						const timeLabel = edited ? `${time} · edited` : time;
						const isOwn = senderId === chatClient?.getUserId();

						let status: MessageStatus | undefined;
						if (isOwn) {
							const sendStatus = ev.getAssociatedStatus();
							if (sendStatus === EventStatus.NOT_SENT) {
								status = "failed";
							} else if (
								sendStatus === EventStatus.SENDING ||
								sendStatus === EventStatus.QUEUED ||
								sendStatus === EventStatus.ENCRYPTING
							) {
								status = "sending";
							} else {
								// on the server — read if anyone else has a receipt past it
								const readers = currentRoom?.getUsersReadUpTo(ev) || [];
								const readByOther = readers.some(
									(u) => u !== chatClient?.getUserId(),
								);
								status = readByOther ? "read" : "sent";
							}
						}

						return {
							key,
							role: isOwn ? "user" : "member",
							content: text,
							extraInfo: {
								title: displayName,
								avatarMxc,
								time: timeLabel,
								status,
							},
						};
					}

					// Non-message/system event
					const systemText = buildSystemHeader(ev);

					return {
						key,
						role: "system",
						content: "",
						extraInfo: {
							systemText,
							time,
						},
					};
				}),
		);
	}, [messages, chatClient, buildSystemHeader, currentRoom]);

	// TODO(antd6): @ant-design/x v2 replaced the `roles` function prop with a
	// `role` object map keyed by role name (RoleProps | FuncRoleProps). Each role
	// here returns FuncRoleProps so it can read per-message data (title/avatar/time).
	const roleConfig = {
		member: (bubbleData: MessageBubble) => {
			const extra = (bubbleData.extraInfo ?? {}) as MessageExtra;
			return {
				placement: "start" as const,
				header: (
					<div style={{ fontSize: 12, color: "#9c9a9a" }}>{extra.title}</div>
				),
				avatar: (
					<MatrixAvatar
						mxcUrl={extra.avatarMxc}
						style={{ background: "#fde3cf" }}
					>
						<UserOutlined />
					</MatrixAvatar>
				),
				typing: { step: 5, interval: 20 },
				footer: (
					<div style={{ fontSize: 10, color: "#cccccc" }}>{extra.time}</div>
				),
				contentRender: RenderIndex,
			};
		},
		user: (bubbleData: MessageBubble) => {
			const extra = (bubbleData.extraInfo ?? {}) as MessageExtra;
			return {
				placement: "end" as const,
				header: (
					<div style={{ fontSize: 12, color: "#9c9a9a" }}>{extra.title}</div>
				),
				avatar: (
					<MatrixAvatar
						mxcUrl={extra.avatarMxc}
						style={{ background: "#aad068" }}
					>
						<UserOutlined />
					</MatrixAvatar>
				),
				footer: (
					<Flex
						align="center"
						gap={4}
						style={{ fontSize: 10, color: "#cccccc" }}
					>
						<span>{extra.time}</span>
						{renderMessageStatus(extra.status)}
					</Flex>
				),
				contentRender: RenderIndex,
			};
		},
		system: (bubbleData: MessageBubble) => {
			const extra = (bubbleData.extraInfo ?? {}) as MessageExtra;
			return {
				placement: "start" as const,
				// system events carry no message body — render text in the header
				// only, and fully hide the (empty) content box so it leaves no gap
				variant: "borderless" as const,
				styles: { content: { display: "none" } },
				header: (
					<div
						style={{
							fontSize: 12,
							color: "#9c9a9a",
							width: "100%",
							textAlign: "center",
						}}
					>
						{extra.systemText}
					</div>
				),
				className: styles.systemMessage,
				contentRender: undefined,
				footer: (
					<div
						style={{
							fontSize: 10,
							color: "#cccccc",
							textAlign: "center",
							width: "100%",
						}}
					>
						{extra.time}
					</div>
				),
			};
		},
	};

	// membership is managed in the global chat store and updated on RoomEvent.MyMembership

	const handleScroll = useCallback(
		(e: UIEvent<HTMLDivElement>) => {
			const target = e.currentTarget;
			const threshold = 120;
			shouldStickToBottomRef.current =
				target.scrollHeight - target.scrollTop - target.clientHeight <
				threshold;

			if (
				target.scrollTop <= threshold &&
				canPaginateBackwards &&
				!isPaginating
			) {
				paginateBackwards();
			}
		},
		[canPaginateBackwards, isPaginating, paginateBackwards],
	);

	const markRoomAsRead = useCallback(() => {
		if (!chatClient || !selectedRoomId || !openChatModal) return;
		const room = chatClient.getRoom(selectedRoomId);
		if (!room) return;
		const events = room.getLiveTimeline().getEvents();
		if (!events?.length) return;
		const lastEvent = [...events]
			.slice()
			.reverse()
			.find((event) => !!event.getId());
		const lastEventId = lastEvent?.getId();
		if (!lastEvent || !lastEventId) return;
		if (lastMarkedEventIdRef.current === lastEventId) return;

		lastMarkedEventIdRef.current = lastEventId;

		Promise.allSettled([
			chatClient.sendReadReceipt(lastEvent),
			chatClient.setRoomReadMarkers(selectedRoomId, lastEventId, lastEvent),
		]).catch(() => {});
	}, [chatClient, openChatModal, selectedRoomId]);

	useEffect(() => {
		lastMarkedEventIdRef.current = null;
		if (!selectedRoomId || !openChatModal) return;
		markRoomAsRead();
	}, [markRoomAsRead, openChatModal, selectedRoomId]);

	useEffect(() => {
		if (!selectedRoomId || !openChatModal) return;
		if (!preparedMessages.length) return;
		markRoomAsRead();
	}, [markRoomAsRead, openChatModal, preparedMessages, selectedRoomId]);

	if (selectedRoomId && userMembership === "invite") {
		// Advice-request chats auto-join the requester, so no invite branch here;
		// a legacy pre-migration invite falls through to DefaultInvite.
		if (chatContext?.type === "vacancy-application") {
			return <VacancyChatInvite />;
		}

		return <DefaultInvite />;
	}

	return (
		<div
			ref={scrollContainerRef}
			className={styles.chatMessagesContainer}
			onScroll={handleScroll}
		>
			<Bubble.List
				ref={listRef}
				style={{ paddingInline: 16 }}
				className={styles.chatMessages}
				items={preparedMessages}
				role={roleConfig}
			/>
		</div>
	);
}
