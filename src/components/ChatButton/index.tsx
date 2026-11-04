import { IconMessageDots } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button } from "antd";
import { useChat } from "@/components/Chat/useChat";
import { UnreadDot } from "@/components/ui";
import styles from "./style.module.scss";

export const ChatButton = () => {
	const { t } = useTranslate();
	const unreadTotal = useChat((s) => s.unreadTotal);
	const open = useChat((s) => s.openChatModal);

	return (
		<Button
			type="text"
			shape="circle"
			size="small"
			data-chat-launcher
			className={open ? styles.open : undefined}
			// The dot says only that something is new; the count is read out here.
			aria-label={
				unreadTotal
					? t("chat.panel.titleUnread", "Messages, {count} unread", {
							count: unreadTotal,
						})
					: t("chat.panel.title", "Messages")
			}
			aria-expanded={open}
			onClick={() => useChat.getState().setOpenChatModal(!open)}
			icon={
				<UnreadDot unread={unreadTotal > 0}>
					<IconMessageDots size={20} stroke={1.75} />
				</UnreadDot>
			}
		/>
	);
};
