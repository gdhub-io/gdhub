import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { App } from "antd";
import axios from "axios";
import { ClientEvent, RoomEvent, UserEvent } from "matrix-js-sdk";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useAccess } from "@/components/access/AccessProvider";
import { SpaceRole } from "@/config/permissions/roles";
import {
	useAnnouncementEdit,
	useAnnouncementPost,
} from "@/hooks/chat-announcements";
import { AnnouncementsAvatar } from "../AnnouncementsAvatar";
import { ConnectedComposer } from "../ChatComposer/connected";
import { contextSlot, type RoomContext } from "../ChatContextLine/kinds";
import ChatPushStatus from "../ChatPushStatus";
import { ConnectedTimeline } from "../ChatTimeline/connected";
import { canPostAnnouncements, isGdhubUserId } from "../model/announcements";
import { resolveRoomDisplayName } from "../roomName";
import { useChat } from "../useChat";
import { useCloseChat } from "../useCloseChat";
import {
	AnnouncementsBanner,
	ChatConversation,
	ChatInvite,
	PostingAsGdhub,
	ReadOnlyBanner,
} from "./index";

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
	// Transport details and push diagnostics are for the hub owner only.
	const hubOwner = useAccess().roleIn("hub") === SpaceRole.Owner;
	const { data: session } = useSession();
	const postAnnouncement = useAnnouncementPost();
	const editAnnouncement = useAnnouncementEdit();
	const [, setVersion] = useState(0);
	const [busy, setBusy] = useState<"accept" | "decline" | null>(null);

	// A deep link can name a room the first sync has not delivered yet.
	useEffect(() => {
		if (!chatClient) return;
		const listener = (() => setVersion((v) => v + 1)) as never;
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

	const room = chatClient?.getRoom(roomId) ?? null;
	const back = () => useChat.getState().setSelectedRoomId(null);
	const close = () => useChat.getState().setOpenChatModal(false);
	const membership = room?.getMyMembership();
	const invited = membership === "invite";
	const slot = contextSlot(context, {
		t,
		invited,
		onClose: () => closeChat(roomId),
	});
	const closed = !!slot?.closed;
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

	const displayName = room
		? resolveRoomDisplayName(room, chatClient) || room.name
		: "";
	const vacancy = context?.data?.vacancy as { title?: string } | undefined;
	// The creator answers before the context request does, so a member never sees the composer flash.
	const announcements =
		context?.type === "announcements" || isGdhubUserId(room?.getCreator());

	const announcementsAdmin =
		announcements &&
		canPostAnnouncements({
			isSuperAdmin: session?.user.isSuperAdmin,
			isStaff: session?.user.isStaff,
		});

	const footer = invited ? null : closed ? (
		<ReadOnlyBanner />
	) : announcements ? (
		announcementsAdmin ? (
			<ConnectedComposer
				roomId={roomId}
				notice={<PostingAsGdhub />}
				onSend={(payload) => postAnnouncement.mutateAsync(payload)}
				onEditSend={(eventId, change) =>
					editAnnouncement.mutateAsync({ eventId, change })
				}
			/>
		) : (
			<AnnouncementsBanner />
		)
	) : (
		<ConnectedComposer roomId={roomId} />
	);

	return (
		<ChatConversation
			name={
				announcements
					? t("chat.announcements.title", "Announcements")
					: displayName
			}
			avatar={announcements ? <AnnouncementsAvatar size={32} /> : undefined}
			subtitle={
				announcements
					? t("chat.announcements.subtitle", "News from GDHub")
					: undefined
			}
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
				hubOwner && (
					<>
						<span>
							{t(
								"chat.info.security",
								"Messages travel over a secure connection (TLS) and only the people in this chat can read them.",
							)}
						</span>
						<span>{t("chat.info.matrix", "Chat is powered by Matrix.")}</span>
						<ChatPushStatus />
					</>
				)
			}
			footer={footer}
		>
			{invited ? (
				<ChatInvite
					name={displayName}
					avatarMxc={member?.getMxcAvatarUrl()}
					position={vacancy?.title}
					offerMessage={context?.data?.offerMessage as string | undefined}
					busy={busy}
					onAccept={() => respond("accept")}
					onDecline={() => respond("decline")}
				/>
			) : (
				room && (
					<ConnectedTimeline
						room={room}
						name={displayName}
						readOnly={closed}
						announcements={announcements}
						announcementsAdmin={announcementsAdmin}
					/>
				)
			)}
		</ChatConversation>
	);
}
