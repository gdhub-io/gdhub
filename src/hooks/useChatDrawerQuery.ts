import type { MatrixClient } from "matrix-js-sdk";
import { useEffect, useRef, useState } from "react";

type UseChatDrawerQueryOptions = {
	chatClient: MatrixClient | null;
	setOpenChatModal: (open: boolean) => void;
	onResolveRoomId: (roomId: string) => void;
};

export function useChatDrawerQuery({
	chatClient,
	setOpenChatModal,
	onResolveRoomId,
}: UseChatDrawerQueryOptions) {
	const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);

	// Keep latest callbacks in refs so the URL-reading effect can run exactly
	// once. Depending on the callbacks directly loops forever when a caller
	// passes inline functions (each render → new identity → effect re-runs →
	// setOpenChatModal → re-render → …).
	const setOpenChatModalRef = useRef(setOpenChatModal);
	const onResolveRoomIdRef = useRef(onResolveRoomId);
	setOpenChatModalRef.current = setOpenChatModal;
	onResolveRoomIdRef.current = onResolveRoomId;

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const url = new URL(window.location.href);
		const chatParam = url.searchParams.get("chat");
		const roomIdParam = url.searchParams.get("roomId");

		if (chatParam === "1") {
			setOpenChatModalRef.current(true);
			if (roomIdParam) {
				setPendingRoomId(roomIdParam);
			}
		}
	}, []);

	useEffect(() => {
		if (!pendingRoomId) return;
		if (!chatClient) return;

		const roomExists = chatClient
			.getRooms()
			.some((room) => room.roomId === pendingRoomId);

		if (roomExists) {
			onResolveRoomIdRef.current(pendingRoomId);
			setPendingRoomId(null);
		}
	}, [chatClient, pendingRoomId]);
}
