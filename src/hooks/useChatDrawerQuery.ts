import type { MatrixClient } from "matrix-js-sdk";
import { useEffect, useState } from "react";

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

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const url = new URL(window.location.href);
		const chatParam = url.searchParams.get("chat");
		const roomIdParam = url.searchParams.get("roomId");

		if (chatParam === "1") {
			setOpenChatModal(true);
			if (roomIdParam) {
				setPendingRoomId(roomIdParam);
			}
		}
	}, [setOpenChatModal]);

	useEffect(() => {
		if (!pendingRoomId) return;
		if (!chatClient) return;

		const roomExists = chatClient
			.getRooms()
			.some((room) => room.roomId === pendingRoomId);

		if (roomExists) {
			onResolveRoomId(pendingRoomId);
			setPendingRoomId(null);
		}
	}, [chatClient, pendingRoomId, onResolveRoomId]);
}
