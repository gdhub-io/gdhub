"use client";

import { useQuery } from "@tanstack/react-query";
import { useTolgee } from "@tolgee/react";
import { Avatar, notification } from "antd";
import axios from "axios";
import {
	ClientEvent,
	type MatrixClient,
	type MatrixEvent,
	NotificationCountType,
	type Room,
	RoomEvent,
} from "matrix-js-sdk";
import { useSession } from "next-auth/react";
import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { getDeviceDisplayName } from "@/helpers/device";
import { useChatDrawerQuery } from "@/hooks/useChatDrawerQuery";
import { useFirebaseMessagingToken } from "@/hooks/useFirebaseMessagingToken";
import { useMatrixDeviceId } from "@/hooks/useMatrixDeviceId";
import { useMatrixPushRegistration } from "@/hooks/useMatrixPushRegistration";
import { createMatrixClient } from "@/lib/matrix-client";
import type { MatrixChatSessionResponse } from "@/types/chat";
import { useChat } from "./useChat";

/**
 * Глобальный bootstrap чата: поднимает единственный Matrix-клиент на сессию,
 * считает непрочитанные, регистрирует push и показывает in-app уведомления о
 * новых сообщениях. Монтируется один раз в `app/(protected)/layout.tsx`, поэтому
 * клиент переживает навигацию между hub / project / event / course layout —
 * любой из них может рендерить <ChatModal/> поверх этого же клиента.
 */
export function ChatProvider({ children }: { children: ReactNode }) {
	const { data: session } = useSession();
	const { getLanguage } = useTolgee();
	const matrixDeviceId = useMatrixDeviceId();
	const clientRef = useRef<MatrixClient | null>(null);
	const { chatClient, setChatClient, setReady, setUnreadTotal } = useChat();

	// drive the drawer from the ?chat=1&roomId=... query params
	useChatDrawerQuery({
		chatClient,
		setOpenChatModal: (open) => useChat.getState().setOpenChatModal(open),
		onResolveRoomId: (roomId) => useChat.getState().setSelectedRoomId(roomId),
	});

	const { data: chatSessionData } = useQuery<MatrixChatSessionResponse>({
		queryKey: ["chat-client-session", session?.user.id],
		queryFn: () =>
			axios
				.post<MatrixChatSessionResponse>("/api/chat/session", {
					deviceId: matrixDeviceId,
				})
				.then((r) => r.data),
		enabled: !!session?.user.id && !!matrixDeviceId,
	});

	const {
		token: firebasePushToken,
		isSupported: pushSupported,
		permissionState: pushPermission,
		error: pushError,
	} = useFirebaseMessagingToken();

	useMatrixPushRegistration({
		session: chatSessionData,
		pushKey: firebasePushToken,
		lang: session?.user.lang ?? getLanguage(),
		deviceDisplayName: getDeviceDisplayName(),
	});

	// surface push readiness so the chat UI can show a diagnostics indicator
	const setPushStatus = useChat((s) => s.setPushStatus);
	useEffect(() => {
		const deviceId = chatSessionData?.deviceId;
		const pusherRegistered =
			typeof window !== "undefined" && deviceId && firebasePushToken
				? !!localStorage.getItem(
						`matrix-pusher:${deviceId}:${firebasePushToken}`,
					)
				: false;
		setPushStatus({
			supported: pushSupported,
			permission: pushPermission,
			hasToken: !!firebasePushToken,
			pusherRegistered,
			error: pushError?.message ?? null,
		});
	}, [
		chatSessionData?.deviceId,
		firebasePushToken,
		pushSupported,
		pushPermission,
		pushError,
		setPushStatus,
	]);

	const tryComputeUnreadTotal = useCallback(
		(client: MatrixClient) => {
			try {
				const rooms = (client.getRooms() || []).filter((r: Room) =>
					["join", "invite"].includes(r.getMyMembership()),
				);
				const total = rooms.reduce((acc: number, r: Room) => {
					const count =
						r.getUnreadNotificationCount?.(NotificationCountType.Total) || 0;
					return acc + (Number.isFinite(count) ? count : 0);
				}, 0);
				setUnreadTotal(total);
			} catch {}
		},
		[setUnreadTotal],
	);

	// boot a single Matrix client and keep it running while on the platform
	useEffect(() => {
		if (!chatSessionData?.token) return;
		if (clientRef.current) return;

		let active = true;
		let createdClient: MatrixClient | null = null;

		const handleSync = (state: string) => {
			if (state === "PREPARED") {
				setReady(true);
				if (createdClient) tryComputeUnreadTotal(createdClient);
			}
		};

		createMatrixClient({
			accessToken: chatSessionData.token,
			userId: chatSessionData.userId,
			deviceId: chatSessionData.deviceId ?? undefined,
		})
			.then((client) => {
				if (!active) {
					client.stopClient();
					return;
				}
				clientRef.current = client;
				createdClient = client;
				client.startClient();
				client.once(ClientEvent.Sync, handleSync);
				setChatClient(client);
			})
			.catch(() => {});

		return () => {
			active = false;
			if (createdClient) {
				createdClient.removeListener(ClientEvent.Sync, handleSync);
				createdClient.stopClient();
			}
			clientRef.current = null;
			setChatClient(null);
			setReady(false);
		};
	}, [
		chatSessionData?.deviceId,
		chatSessionData?.token,
		chatSessionData?.userId,
		setChatClient,
		setReady,
		tryComputeUnreadTotal,
	]);

	// recompute unread badge on live activity
	useEffect(() => {
		if (!chatClient) return;

		const recompute = () => tryComputeUnreadTotal(chatClient);

		chatClient.on(RoomEvent.Receipt, recompute);
		chatClient.on(RoomEvent.Timeline, recompute);
		chatClient.on(RoomEvent.MyMembership, recompute);

		const interval = setInterval(recompute, 60_000);
		recompute();

		return () => {
			chatClient.removeListener(RoomEvent.Receipt, recompute);
			chatClient.removeListener(RoomEvent.Timeline, recompute);
			chatClient.removeListener(RoomEvent.MyMembership, recompute);
			clearInterval(interval);
		};
	}, [chatClient, tryComputeUnreadTotal]);

	// in-app toast for incoming messages (live only, foreground only)
	useEffect(() => {
		if (!chatClient) return;

		const onTimeline = (
			event: MatrixEvent,
			room: Room | undefined,
			toStartOfTimeline?: boolean,
		) => {
			try {
				if (toStartOfTimeline || !room) return;
				// only live events, not initial backfill / history pagination
				if (chatClient.getSyncState() !== "SYNCING") return;
				if (event.getType() !== "m.room.message") return;
				if (event.getSender() === chatClient.getUserId()) return;

				// skip when the tab is hidden — the push notification covers that
				if (typeof document !== "undefined" && document.hidden) return;

				// skip when the user is already looking at this room
				const {
					openChatModal,
					selectedRoomId,
					setSelectedRoomId,
					setOpenChatModal,
				} = useChat.getState();
				if (openChatModal && selectedRoomId === room.roomId) return;

				const sender = event.getSender() || "";
				const member = room.getMember(sender);
				const senderName = member?.name || room.name || sender;
				const avatarUrl =
					member?.getAvatarUrl(
						chatClient.baseUrl,
						40,
						40,
						"crop",
						true,
						true,
					) || undefined;
				const body =
					(event.getContent()?.body as string | undefined) || "New message";

				notification.open({
					key: room.roomId,
					message: senderName,
					description: body,
					icon: (
						<Avatar src={avatarUrl}>{senderName?.[0]?.toUpperCase()}</Avatar>
					),
					onClick: () => {
						setSelectedRoomId(room.roomId);
						setOpenChatModal(true);
						notification.destroy(room.roomId);
					},
				});
			} catch {}
		};

		chatClient.on(RoomEvent.Timeline, onTimeline);
		return () => {
			chatClient.removeListener(RoomEvent.Timeline, onTimeline);
		};
	}, [chatClient]);

	// in-app toast when a new chat invitation arrives (live only)
	useEffect(() => {
		if (!chatClient) return;

		const onMembership = (
			room: Room,
			membership: string,
			prevMembership?: string,
		) => {
			try {
				// only a fresh invite, and only on live sync (skip initial backfill)
				if (membership !== "invite") return;
				if (prevMembership === "invite") return;
				if (chatClient.getSyncState() !== "SYNCING") return;

				// skip when the tab is hidden — the push notification covers that
				if (typeof document !== "undefined" && document.hidden) return;

				const inviter = room.currentState
					.getStateEvents("m.room.member", chatClient.getUserId() || "")
					?.getSender();
				const inviterMember = inviter ? room.getMember(inviter) : null;
				const inviterName = inviterMember?.name || inviter || "Someone";
				const avatarUrl =
					inviterMember?.getAvatarUrl(
						chatClient.baseUrl,
						40,
						40,
						"crop",
						true,
						true,
					) || undefined;

				notification.open({
					key: `invite:${room.roomId}`,
					message: "New chat",
					description: `${inviterName} started a chat with you`,
					icon: (
						<Avatar src={avatarUrl}>{inviterName?.[0]?.toUpperCase()}</Avatar>
					),
					onClick: () => {
						const { setSelectedRoomId, setOpenChatModal } = useChat.getState();
						setSelectedRoomId(room.roomId);
						setOpenChatModal(true);
						notification.destroy(`invite:${room.roomId}`);
					},
				});
			} catch {}
		};

		chatClient.on(RoomEvent.MyMembership, onMembership);
		return () => {
			chatClient.removeListener(RoomEvent.MyMembership, onMembership);
		};
	}, [chatClient]);

	// global "open-chat" event (used by notifications / deep links)
	useEffect(() => {
		const handler = (e: CustomEvent<{ roomId?: string }>) => {
			const roomId = e?.detail?.roomId;
			const { setSelectedRoomId, setOpenChatModal } = useChat.getState();
			if (roomId) setSelectedRoomId(roomId);
			setOpenChatModal(true);
		};
		window.addEventListener("open-chat", handler as EventListener);
		return () =>
			window.removeEventListener("open-chat", handler as EventListener);
	}, []);

	return <>{children}</>;
}
