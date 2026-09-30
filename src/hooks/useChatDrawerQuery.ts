import { useEffect } from "react";
import { useChat } from "@/components/Chat/useChat";

/**
 * `?chat=1&roomId=` opens the chat panel straight on that conversation. The
 * room may not be synced yet — the conversation view waits for it.
 */
export function useChatDrawerQuery() {
	useEffect(() => {
		const url = new URL(window.location.href);
		if (url.searchParams.get("chat") !== "1") return;

		const { setOpenChatModal, setSelectedRoomId } = useChat.getState();
		const roomId = url.searchParams.get("roomId");
		if (roomId) setSelectedRoomId(roomId);
		setOpenChatModal(true);
	}, []);
}
