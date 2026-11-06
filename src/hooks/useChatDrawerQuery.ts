import { useEffect } from "react";
import { useChat } from "@/components/Chat/useChat";
import { roomIdFromHash } from "@/lib/chat/deep-link";

/**
 * `?chat=1&roomId=` opens the chat panel straight on that conversation. So does
 * `#/room/<id>`: emails sent before `client_base_url` pointed at /open-chat link to
 * `/hub#/room/…`. The room may not be synced yet — the conversation view waits for it.
 */
export function useChatDrawerQuery() {
	useEffect(() => {
		const url = new URL(window.location.href);
		const hashRoomId = roomIdFromHash(url.hash);
		if (url.searchParams.get("chat") !== "1" && !hashRoomId) return;

		const { setOpenChatModal, setSelectedRoomId } = useChat.getState();
		const roomId = hashRoomId ?? url.searchParams.get("roomId");
		if (roomId) setSelectedRoomId(roomId);
		setOpenChatModal(true);
		if (hashRoomId) {
			window.history.replaceState(null, "", url.pathname + url.search);
		}
	}, []);
}
