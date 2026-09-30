import { IconPlus, IconX } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Tooltip, Typography } from "antd";
import { useState } from "react";
import { useAccess } from "@/components/access/AccessProvider";
import { ConnectedConversation } from "../ChatConversation/connected";
import { ConnectedChatRoomList } from "../ChatRoomList/connected";
import NewChatModal from "../NewChatModal";
import { useChat } from "../useChat";
import styles from "./ChatPanel.module.scss";

function ListView({ hidden }: { hidden: boolean }) {
	const { t } = useTranslate();
	const { can } = useAccess();
	const [openNewChat, setOpenNewChat] = useState(false);

	return (
		<div className={hidden ? styles.hidden : styles.view}>
			<div className={styles.header}>
				<Typography.Title level={3} className={styles.title}>
					{t("chat.panel.title", "Messages")}
				</Typography.Title>
				{/* POST /api/chat/rooms/direct is guarded by the same permission. */}
				{can("admin.users.manage") && (
					<Tooltip title={t("chat.panel.newChat", "New chat")}>
						<Button
							type="text"
							icon={<IconPlus size={20} />}
							aria-label={t("chat.panel.newChat", "New chat")}
							onClick={() => setOpenNewChat(true)}
						/>
					</Tooltip>
				)}
				<Button
					type="text"
					icon={<IconX size={20} />}
					aria-label={t("chat.panel.close", "Close")}
					onClick={() => useChat.getState().setOpenChatModal(false)}
				/>
			</div>
			<ConnectedChatRoomList />
			<NewChatModal open={openNewChat} onClose={() => setOpenNewChat(false)} />
		</div>
	);
}

export default function ChatPanelBody() {
	const selectedRoomId = useChat((s) => s.selectedRoomId);

	return (
		<div className={styles.body}>
			{/* The list stays mounted under a conversation so back keeps its scroll. */}
			<ListView hidden={!!selectedRoomId} />
			{selectedRoomId && (
				<ConnectedConversation key={selectedRoomId} roomId={selectedRoomId} />
			)}
		</div>
	);
}
