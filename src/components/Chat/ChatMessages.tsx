import { UserOutlined } from "@ant-design/icons";
import { Bubble, type BubbleProps } from "@ant-design/x";
import type { BubbleDataType } from "@ant-design/x/es/bubble/BubbleList";
import { Flex, type GetRef } from "antd";
import dayjs from "dayjs";
import {
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
import AdviceRequestInvite from "./special-messages/AdviceRequestInvite";
import DefaultInvite from "./special-messages/DefaultInvite";
import { useChat } from "./useChat";

type MessageBubble = BubbleDataType & {
	title?: string;
	avatarUrl?: string;
	time?: string;
	systemText?: string;
};

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

const RenderIndex: BubbleProps["messageRender"] = (content) => (
	<Flex style={{ whiteSpace: "pre-line", wordBreak: "break-word" }}>
		{content}
	</Flex>
);

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

		chatClient.on(RoomEvent.Timeline, handleTimeline);
		return () => {
			chatClient.removeListener(RoomEvent.Timeline, handleTimeline);
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
				listRef.current?.scrollTo?.({ offset: Number.MAX_SAFE_INTEGER });
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
						const homeserverBaseUrl = chatClient?.baseUrl;
						const memberAvatarUrl = homeserverBaseUrl
							? member?.getAvatarUrl(
									homeserverBaseUrl,
									64,
									64,
									"crop",
									true,
									true,
								) || undefined
							: undefined;
						const avatarUrl =
							memberAvatarUrl ||
							(chatUser?.avatarUrl
								? chatClient?.mxcUrlToHttp(chatUser.avatarUrl) || undefined
								: undefined);
						const displayName = member?.name || chatUser?.displayName;
						const edited = !!ev.replacingEventId?.();
						const timeLabel = edited ? `${time} · edited` : time;

						return {
							key,
							role: senderId === chatClient?.getUserId() ? "user" : "member",
							content: text,
							title: displayName,
							avatarUrl,
							time: timeLabel,
						};
					}

					// Non-message/system event
					const systemText = buildSystemHeader(ev);

					return {
						key,
						role: "system",
						content: "",
						systemText,
						time,
					};
				}),
		);
	}, [messages, chatClient, buildSystemHeader, currentRoom]);

	const renderRoles = (bubbleData: MessageBubble) => {
		switch (bubbleData.role) {
			case "member":
				return {
					placement: "start" as const,
					header: (
						<div style={{ fontSize: 12, color: "#9c9a9a" }}>
							{bubbleData.title}
						</div>
					),
					avatar: bubbleData.avatarUrl
						? { src: bubbleData.avatarUrl }
						: { icon: <UserOutlined />, style: { background: "#fde3cf" } },
					typing: { step: 5, interval: 20 },
					footer: (
						<div style={{ fontSize: 10, color: "#cccccc" }}>
							{bubbleData.time}
						</div>
					),
					messageRender: RenderIndex,
				};
			case "user":
				return {
					placement: "end" as const,
					header: (
						<div style={{ fontSize: 12, color: "#9c9a9a" }}>
							{bubbleData.title}
						</div>
					),
					avatar: bubbleData.avatarUrl
						? { src: bubbleData.avatarUrl }
						: { icon: <UserOutlined />, style: { background: "#aad068" } },
					footer: (
						<div style={{ fontSize: 10, color: "#cccccc" }}>
							{bubbleData.time}
						</div>
					),
					messageRender: RenderIndex,
				};
			case "system":
				return {
					placement: "start" as const,
					header: (
						<div
							style={{
								fontSize: 12,
								color: "#9c9a9a",
								width: "100%",
								textAlign: "center",
							}}
						>
							{bubbleData.systemText}
						</div>
					),
					className: styles.systemMessage,
					messageRender: undefined,
					footer: (
						<div
							style={{
								fontSize: 10,
								color: "#cccccc",
								textAlign: "center",
								width: "100%",
							}}
						>
							{bubbleData.time}
						</div>
					),
				};
			default:
				return { messageRender: RenderIndex };
		}
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
		if (chatContext?.type === "advice-request") {
			return <AdviceRequestInvite />;
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
				roles={renderRoles}
			/>
		</div>
	);
}
