import { useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { App } from "antd";
import axios from "axios";

/** Confirm, then close the chat: read-only for both, moved to Closed. */
export function useCloseChat() {
	const { t } = useTranslate();
	const { modal, message } = App.useApp();
	const queryClient = useQueryClient();

	return (roomId: string) =>
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
					await Promise.all([
						queryClient.invalidateQueries({ queryKey: ["chat-room-meta"] }),
						queryClient.invalidateQueries({
							queryKey: ["chat-room-context", roomId],
						}),
					]);
					message.success(t("chat.closeConfirm.success", "Chat closed"));
				} catch {
					message.error(
						t("chat.closeConfirm.error", "Couldn't close the chat"),
					);
				}
			},
		});
}
