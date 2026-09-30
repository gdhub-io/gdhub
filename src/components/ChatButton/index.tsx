import { IconMessageCircle } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Badge, Button, theme } from "antd";
import { ChatPanel } from "@/components/Chat/ChatPanel";
import { useChat } from "@/components/Chat/useChat";
import styles from "./style.module.scss";

export const ChatButton = () => {
	const { t } = useTranslate();
	const { token } = theme.useToken();
	const unreadTotal = useChat((s) => s.unreadTotal);
	const open = useChat((s) => s.openChatModal);

	return (
		<ChatPanel>
			<Badge
				count={unreadTotal}
				overflowCount={99}
				size="small"
				color={token.colorPrimary}
				offset={[-6, 22]}
			>
				<Button
					type="text"
					shape="circle"
					className={open ? styles.open : undefined}
					aria-label={t("chat.panel.title", "Messages")}
					aria-expanded={open}
					onClick={() => useChat.getState().setOpenChatModal(!open)}
					icon={<IconMessageCircle size={18} stroke={1.75} />}
				/>
			</Badge>
		</ChatPanel>
	);
};
