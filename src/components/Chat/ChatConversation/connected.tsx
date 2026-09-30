import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { App } from "antd";
import axios from "axios";
import { ClientEvent, type Room, RoomEvent, UserEvent } from "matrix-js-sdk";
import { useEffect, useState } from "react";
import { useAccess } from "@/components/access/AccessProvider";
import { contextSlot, type RoomContext } from "../ChatContextLine/kinds";
import ChatInput from "../ChatInput";
import ChatMessages from "../ChatMessages";
import ChatPushStatus from "../ChatPushStatus";
import { resolveRoomDisplayName } from "../roomName";
import { useChat } from "../useChat";
import { useCloseChat } from "../useCloseChat";
import { ChatConversation, ChatInvite, ReadOnlyBanner } from "./index";

const ROOM_EVENTS = [
	ClientEvent.Room,
	RoomEvent.MyMembership,
	RoomEvent.Name,
	UserEvent.Presence,
	UserEvent.CurrentlyActive,
] as const;

// fire-and-forget: tell the backend to notify the inviter (Novu inbox)
function notifyInviteResponse(roomId: string, action: "accepted" | "declined") {
	axios
		.post(`/api/chat/rooms/${encodeURIComponent(roomId)}/invite-response`, {
			action,
		})
		.catch(() => {});
}

/** `ChatConversation` for one Matrix room, with its registry context. */
export function ConnectedConversation({ roomId }: { roomId: string }) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const chatClient = useChat((s) => s.chatClient);
	const ready = useChat((s) => s.ready);
	const closeChat = useCloseChat();
	const { isIn } = useAccess();
	const [room, setRoom] = useState<Room | null>(
		() => chatClient?.getRoom(roomId) ?? null,
	);
	const [, rerender] = useState(0);
	const [busy, setBusy] = useState<"accept" | "decline" | null>(null);

	// A deep link can name a room the first sync has not delivered yet.
	useEffect(() => {
		if (!chatClient) return;
		const sync = () => {
			setRoom(chatClient.getRoom(roomId));
			rerender((n) => n + 1);
		};
		sync();
		const listener = sync as never;
		for (const event of ROOM_EVENTS) chatClient.on(event as never, listener);
		return () => {
			for (const event of ROOM_EVENTS) {
				chatClient.removeListener(event as never, listener);
			}
		};
	}, [chatClient, roomId]);

	const { data: context } = useQuery({
		queryKey: ["chat-room-context", roomId],
		queryFn: () =>
			axios
				.get<RoomContext>(`/api/chat/rooms/${encodeURIComponent(roomId)}`)
				.then((res) => res.data),
	});

	const back = () => useChat.getState().setSelectedRoomId(null);
	const close = () => useChat.getState().setOpenChatModal(false);
	const membership = room?.getMyMembership();
	const invited = membership === "invite";
	const slot = contextSlot(context, {
		t,
		invited,
		onClose: () => closeChat(roomId),
	});
	const closed = slot?.status === "closed";
	const member = room?.getAvatarFallbackMember();
	const user = member?.user;
	const online = !!user && (user.currentlyActive || user.presence === "online");

	const respond = async (action: "accept" | "decline") => {
		if (!chatClient) return;
		setBusy(action);
		try {
			if (action === "accept") await chatClient.joinRoom(roomId);
			else await chatClient.leave(roomId);
			notifyInviteResponse(
				roomId,
				action === "accept" ? "accepted" : "declined",
			);
			if (action === "decline") back();
		} catch {
			message.error(t("chat.invite.error", "Couldn't answer the invite"));
		} finally {
			setBusy(null);
		}
	};

	const vacancy = context?.data?.vacancy as { title?: string } | undefined;

	return (
		<ChatConversation
			name={room ? resolveRoomDisplayName(room, chatClient) || room.name : ""}
			avatarMxc={room?.getMxcAvatarUrl() || member?.getMxcAvatarUrl() || null}
			presence={invited ? "invitation" : online ? "online" : null}
			context={slot}
			state={
				room && membership && ["join", "invite"].includes(membership)
					? "ready"
					: ready
						? "unavailable"
						: "loading"
			}
			onBack={back}
			onClose={close}
			info={
				<>
					<span>
						{t(
							"chat.info.security",
							"Messages travel over a secure connection (TLS) and only the people in this chat can read them.",
						)}
					</span>
					<span>{t("chat.info.matrix", "Chat is powered by Matrix.")}</span>
					{isIn("admin") && <ChatPushStatus />}
				</>
			}
			footer={invited ? null : closed ? <ReadOnlyBanner /> : <ChatInput />}
		>
			{invited ? (
				<ChatInvite
					name={room ? resolveRoomDisplayName(room, chatClient) : ""}
					avatarMxc={member?.getMxcAvatarUrl()}
					position={vacancy?.title}
					offerMessage={context?.data?.offerMessage as string | undefined}
					busy={busy}
					onAccept={() => respond("accept")}
					onDecline={() => respond("decline")}
				/>
			) : (
				<ChatMessages />
			)}
		</ChatConversation>
	);
}
