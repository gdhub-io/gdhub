import { UserOutlined } from "@ant-design/icons";
import { Bubble, type BubbleProps } from "@ant-design/x";
import type { BubbleDataType } from "@ant-design/x/es/bubble/BubbleList";
import { Flex, type GetRef } from "antd";
import dayjs from "dayjs";
import { type MatrixEvent, RoomEvent } from "matrix-js-sdk";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./ChatModal.module.scss";
import AdviceRequestInvite from "./special-messages/AdviceRequestInvite";
import DefaultInvite from "./special-messages/DefaultInvite";
import { useChat } from "./useChat";

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
	const { selectedRoomId, chatClient, ready, userMembership, chatContext } =
		useChat();
	const [messages, setMessages] = useState<MatrixEvent[]>([]);
	const [preparedMessages, setPreparedMessages] = useState<BubbleDataType[]>(
		[],
	);

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

	useEffect(() => {
		if (!chatClient || !ready || !selectedRoomId) return;

		const room = chatClient.getRoom(selectedRoomId);
		if (!room) {
			setMessages([]);
			return;
		}

		const initial = room.getLiveTimeline().getEvents().slice(-50);
		setMessages(initial);

		console.log("[chat] initial", initial);

		const handleTimeline = (
			event: MatrixEvent,
			evRoom: any,
			toStartOfTimeline?: boolean,
		) => {
			if (toStartOfTimeline) return;
			if (!evRoom || evRoom.roomId !== selectedRoomId) return;

			setMessages((prev) => [...prev, event]);
		};

		chatClient.on(RoomEvent.Timeline, handleTimeline);
		return () => {
			chatClient.removeListener(RoomEvent.Timeline, handleTimeline);
		};
	}, [chatClient, ready, selectedRoomId]);

	useEffect(() => {
		// Scroll to bottom on new messages
		try {
			listRef.current?.scrollTo?.({ offset: Number.MAX_SAFE_INTEGER });
		} catch {}
	}, [preparedMessages]);

	console.log("[chat] messages", messages);

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
						const content: any = ev.getContent() || {};
						const text =
							content.body || content.formatted_body || JSON.stringify(content);
						const chatUser = chatClient?.getUser(senderId as string);
						const avatarUrl = chatClient?.mxcUrlToHttp(
							chatUser?.avatarUrl || "",
						);
						const edited = !!ev.replacingEventId?.();
						const timeLabel = edited ? `${time} · edited` : time;

						return {
							key,
							role: senderId === chatClient?.getUserId() ? "user" : "member",
							content: text,
							title: chatUser?.displayName,
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
	}, [messages, chatClient]);

	function buildSystemHeader(ev: MatrixEvent): string {
		const type = ev.getType();
		const senderId = ev.getSender();
		const content: any = ev.getContent() || {};
		const userDisplay =
			chatClient?.getUser(senderId || "")?.displayName || "Unknown";
		const invitedDisplay = ev?.getContent()?.displayname || "User";

		switch (type) {
			case "m.room.member": {
				const membership = content?.membership;
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
	}

	const renderRoles = (bubbleData: BubbleDataType, index: number) => {
		switch (bubbleData.role) {
			case "member":
				return {
					placement: "start" as const,
					header: (
						<div style={{ fontSize: 12, color: "#9c9a9a" }}>
							{(bubbleData as any).title}
						</div>
					),
					avatar: (bubbleData as any).avatarUrl
						? { src: (bubbleData as any).avatarUrl }
						: { icon: <UserOutlined />, style: { background: "#fde3cf" } },
					typing: { step: 5, interval: 20 },
					footer: (
						<div style={{ fontSize: 10, color: "#cccccc" }}>
							{(bubbleData as any).time}
						</div>
					),
					messageRender: RenderIndex,
				};
			case "user":
				return {
					placement: "end" as const,
					header: (
						<div style={{ fontSize: 12, color: "#9c9a9a" }}>
							{(bubbleData as any).title}
						</div>
					),
					avatar: (bubbleData as any).avatarUrl
						? { src: (bubbleData as any).avatarUrl }
						: { icon: <UserOutlined />, style: { background: "#aad068" } },
					footer: (
						<div style={{ fontSize: 10, color: "#cccccc" }}>
							{(bubbleData as any).time}
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
							{(bubbleData as any).systemText}
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
							{(bubbleData as any).time}
						</div>
					),
				};
			default:
				return { messageRender: RenderIndex };
		}
	};

	// membership is managed in the global chat store and updated on RoomEvent.MyMembership

	const [specialRootType, specialId] = useMemo(() => {
		if (!selectedRoomId || !chatClient) return [null, null];

		const room = selectedRoomId ? chatClient?.getRoom(selectedRoomId) : null;
		const alias = room?.getCanonicalAlias();
		const [localpart] = alias?.split(":") || [];
		const [specialRootType, specialId] = localpart?.split("-") || [];

		return [specialRootType, specialId];
	}, [selectedRoomId, chatClient]);

	if (selectedRoomId && userMembership === "invite") {
		if (chatContext?.type === "advice-request" && !chatContext?.isExpert) {
			return <AdviceRequestInvite />;
		}

		return <DefaultInvite />;
	}

	return (
		<Bubble.List
			ref={listRef}
			style={{ paddingInline: 16 }}
			className={styles.chatMessages}
			items={preparedMessages}
			roles={renderRoles}
		/>
	);
}
