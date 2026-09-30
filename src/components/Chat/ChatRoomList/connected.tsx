import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { App } from "antd";
import axios from "axios";
import { ClientEvent, RoomEvent, UserEvent } from "matrix-js-sdk";
import { useEffect, useMemo, useState } from "react";
import type { ChatRoomMeta } from "@/types/chat";
import { markRoomRead, summarizeRoom } from "../matrix";
import type { ChatTab } from "../model/rooms";
import { useChat } from "../useChat";
import { ChatRoomList } from "./index";

// Room ids per request — keeps the GET URL far below header limits.
const META_CHUNK = 100;

const LIST_EVENTS = [
	ClientEvent.Room,
	ClientEvent.DeleteRoom,
	RoomEvent.Timeline,
	RoomEvent.Receipt,
	RoomEvent.MyMembership,
	RoomEvent.Name,
	RoomEvent.Redaction,
	RoomEvent.LocalEchoUpdated,
	UserEvent.Presence,
	UserEvent.CurrentlyActive,
] as const;

/** `ChatRoomList` fed from the Matrix client and the room registry. */
export function ConnectedChatRoomList() {
	const { t } = useTranslate();
	const { modal, message } = App.useApp();
	const queryClient = useQueryClient();
	const chatClient = useChat((s) => s.chatClient);
	const ready = useChat((s) => s.ready);
	const syncError = useChat((s) => s.syncError);
	const [tab, setTab] = useState<ChatTab>("all");
	const [version, setVersion] = useState(0);

	useEffect(() => {
		if (!chatClient) return;
		let frame = 0;
		// Bursts of timeline events collapse into one rebuild per frame.
		const bump = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => setVersion((v) => v + 1));
		};
		// One listener for events of different emitter maps; the payload is unused.
		const listener = bump as never;
		for (const event of LIST_EVENTS) chatClient.on(event as never, listener);
		return () => {
			cancelAnimationFrame(frame);
			for (const event of LIST_EVENTS) {
				chatClient.removeListener(event as never, listener);
			}
		};
	}, [chatClient]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: `version` is the Matrix change signal
	const rooms = useMemo(
		() =>
			ready && chatClient
				? chatClient
						.getRooms()
						.filter((room) =>
							["join", "invite"].includes(room.getMyMembership()),
						)
				: null,
		[chatClient, ready, version],
	);

	const roomIds = useMemo(
		() => (rooms ?? []).map((room) => room.roomId).sort(),
		[rooms],
	);

	const { data: meta } = useQuery({
		queryKey: ["chat-room-meta", roomIds.join(",")],
		queryFn: async () => {
			const chunks: string[][] = [];
			for (let i = 0; i < roomIds.length; i += META_CHUNK) {
				chunks.push(roomIds.slice(i, i + META_CHUNK));
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
		placeholderData: (previous) => previous,
	});

	const summaries = useMemo(
		() =>
			rooms && chatClient
				? rooms.map((room) =>
						summarizeRoom(room, chatClient, meta?.[room.roomId]),
					)
				: null,
		[rooms, chatClient, meta],
	);

	const closeChat = (roomId: string) =>
		modal.confirm({
			title: t("chat.closeConfirm.title", "Close this chat?"),
			content: t(
				"chat.closeConfirm.content",
				"You'll both still be able to read it, but nobody can send new messages. It moves to Closed.",
			),
			okText: t("chat.closeConfirm.ok", "Close chat"),
			cancelText: t("chat.closeConfirm.cancel", "Cancel"),
			onOk: async () => {
				try {
					await axios.put(
						`/api/chat/rooms/${encodeURIComponent(roomId)}/resolve`,
					);
					await queryClient.invalidateQueries({ queryKey: ["chat-room-meta"] });
					message.success(t("chat.closeConfirm.success", "Chat closed"));
				} catch {
					message.error(
						t("chat.closeConfirm.error", "Couldn't close the chat"),
					);
				}
			},
		});

	return (
		<ChatRoomList
			rooms={summaries}
			error={!ready && syncError}
			onRetry={() => chatClient?.retryImmediately()}
			tab={tab}
			onTabChange={setTab}
			onSelect={(roomId) => useChat.getState().setSelectedRoomId(roomId)}
			onMarkRead={(roomId) => {
				if (chatClient) markRoomRead(chatClient, roomId);
			}}
			onCloseChat={closeChat}
			onLeave={(roomId) => {
				chatClient?.leave(roomId).catch(() => {
					message.error(t("chat.row.leaveError", "Couldn't leave the chat"));
				});
			}}
		/>
	);
}
