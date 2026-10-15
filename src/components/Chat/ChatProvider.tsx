"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTolgee } from "@tolgee/react";
import { App, Avatar } from "antd";
import axios from "axios";
import type { MatrixClient, MatrixEvent, Room, SyncState } from "matrix-js-sdk";
import { useSession } from "next-auth/react";
import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { getDeviceDisplayName } from "@/helpers/device";
import { pusherCacheKey } from "@/helpers/matrix-pushers";
import { useChatDrawerQuery } from "@/hooks/useChatDrawerQuery";
import { useFirebaseMessagingToken } from "@/hooks/useFirebaseMessagingToken";
import { useMatrixDeviceId } from "@/hooks/useMatrixDeviceId";
import { useMatrixPushRegistration } from "@/hooks/useMatrixPushRegistration";
import type { MatrixChatSessionResponse } from "@/types/chat";
import { MatrixEvents, SyncStates, TOTAL_COUNT } from "./matrix-events";
import { endChatSession } from "./session";
import { useChat } from "./useChat";

/**
 * Global chat bootstrap: brings up the single Matrix client for the session,
 * counts unread messages, registers push and shows in-app notifications about
 * new messages. Mounted once in `app/(protected)/layout.tsx`, so the client
 * survives navigation between the hub / project / event / course layouts —
 * any of them can render <ChatModal/> on top of that same client.
 */
export function ChatProvider({ children }: { children: ReactNode }) {
	const { data: session } = useSession();
	const { getLanguage } = useTolgee();
	const { notification } = App.useApp();
	const queryClient = useQueryClient();
	const matrixDeviceId = useMatrixDeviceId();
	const clientRef = useRef<MatrixClient | null>(null);
	const { chatClient, setChatClient, setReady, setUnreadTotal } = useChat();

	useChatDrawerQuery();

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
		const matrixUserId = chatSessionData?.userId;
		const pusherRegistered =
			typeof window !== "undefined" &&
			deviceId &&
			matrixUserId &&
			firebasePushToken
				? !!localStorage.getItem(
						pusherCacheKey(matrixUserId, deviceId, firebasePushToken),
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
		chatSessionData?.userId,
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
				// An unanswered invite counts as one unread message.
				const total = rooms.reduce((acc: number, r: Room) => {
					if (r.getMyMembership() === "invite") return acc + 1;
					const count = r.getUnreadNotificationCount?.(TOTAL_COUNT) || 0;
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

		// `on`, not `once`: the first sync event is ERROR whenever the homeserver
		// is unreachable at boot, and consuming it would leave the chat stuck on
		// its loader for the rest of the session.
		const handleSync = (state: SyncState) => {
			if (state === SyncStates.error) {
				if (!useChat.getState().ready) useChat.getState().setSyncError(true);
				return;
			}
			if (state !== SyncStates.prepared) return;
			useChat.getState().setSyncError(false);
			setReady(true);
			if (createdClient) tryComputeUnreadTotal(createdClient);
		};

		// The homeserver rejected the token (expired, revoked, account erased).
		// Drop it and pull a fresh session instead of dying silently.
		const handleLoggedOut = () => {
			endChatSession({ expired: true }).finally(() => {
				queryClient.invalidateQueries({ queryKey: ["chat-client-session"] });
			});
		};

		// Loaded here, not imported: the SDK is only needed once there is a
		// session, and a static import would ship it with every app page.
		import("@/lib/matrix-client")
			.then(async ({ createMatrixClient, INITIAL_SYNC_LIMIT }) => {
				const client = await createMatrixClient({
					accessToken: chatSessionData.token,
					userId: chatSessionData.userId,
					deviceId: chatSessionData.deviceId ?? undefined,
				});
				if (!active) {
					client.stopClient();
					return;
				}
				clientRef.current = client;
				createdClient = client;
				client.on(MatrixEvents.sync, handleSync);
				client.on(MatrixEvents.sessionLoggedOut, handleLoggedOut);
				// Lazy members and a bounded timeline keep the initial sync small
				// on accounts with many rooms.
				client.startClient({
					lazyLoadMembers: true,
					initialSyncLimit: INITIAL_SYNC_LIMIT,
				});
				setChatClient(client);
			})
			.catch(() => {});

		return () => {
			active = false;
			if (createdClient) {
				createdClient.removeListener(MatrixEvents.sync, handleSync);
				createdClient.removeListener(
					MatrixEvents.sessionLoggedOut,
					handleLoggedOut,
				);
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
		queryClient,
		setChatClient,
		setReady,
		tryComputeUnreadTotal,
	]);

	// recompute unread badge on live activity
	useEffect(() => {
		if (!chatClient) return;

		const recompute = () => tryComputeUnreadTotal(chatClient);

		chatClient.on(MatrixEvents.receipt, recompute);
		chatClient.on(MatrixEvents.timeline, recompute);
		chatClient.on(MatrixEvents.myMembership, recompute);

		const interval = setInterval(recompute, 60_000);
		recompute();

		return () => {
			chatClient.removeListener(MatrixEvents.receipt, recompute);
			chatClient.removeListener(MatrixEvents.timeline, recompute);
			chatClient.removeListener(MatrixEvents.myMembership, recompute);
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
						<AppAvatar src={avatarUrl}>
							{senderName?.[0]?.toUpperCase()}
						</AppAvatar>
					),
					onClick: () => {
						setSelectedRoomId(room.roomId);
						setOpenChatModal(true);
						notification.destroy(room.roomId);
					},
				});
			} catch {}
		};

		chatClient.on(MatrixEvents.timeline, onTimeline);
		return () => {
			chatClient.removeListener(MatrixEvents.timeline, onTimeline);
		};
	}, [chatClient, notification]);

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
						<AppAvatar src={avatarUrl}>
							{inviterName?.[0]?.toUpperCase()}
						</AppAvatar>
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

		chatClient.on(MatrixEvents.myMembership, onMembership);
		return () => {
			chatClient.removeListener(MatrixEvents.myMembership, onMembership);
		};
	}, [chatClient, notification]);

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
