import { IconArrowLeft, IconPlus, IconX } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Popover, Spin, Typography } from "antd";
import axios from "axios";
import { ClientEvent, RoomEvent } from "matrix-js-sdk";
import { useEffect, useState } from "react";
import { useAccess } from "@/components/access/AccessProvider";
import ChatInput from "../ChatInput";
import ChatMessages from "../ChatMessages";
import ChatPushStatus from "../ChatPushStatus";
import { ConnectedChatRoomList } from "../ChatRoomList/connected";
import ChatTitle from "../ChatTitle";
import ChatTopic from "../ChatTopic";
import NewChatModal from "../NewChatModal";
import { useChat } from "../useChat";
import styles from "./ChatPanel.module.scss";

const close = () => useChat.getState().setOpenChatModal(false);

function CloseButton() {
	const { t } = useTranslate();
	return (
		<Button
			type="text"
			icon={<IconX size={20} />}
			aria-label={t("chat.panel.close", "Close")}
			onClick={close}
		/>
	);
}

function ListView({ hidden }: { hidden: boolean }) {
	const { t } = useTranslate();
	const { can, isIn } = useAccess();
	const [openNewChat, setOpenNewChat] = useState(false);

	return (
		<div className={hidden ? styles.hidden : styles.view}>
			<div className={styles.header}>
				<Typography.Title level={3} className={styles.title}>
					{t("chat.panel.title", "Messages")}
				</Typography.Title>
				{/* POST /api/chat/rooms/direct is guarded by the same permission. */}
				{can("admin.users.manage") && (
					<Popover
						title={t("chat.panel.newChat", "New chat")}
						content={isIn("admin") ? <ChatPushStatus /> : null}
					>
						<Button
							type="text"
							icon={<IconPlus size={20} />}
							aria-label={t("chat.panel.newChat", "New chat")}
							onClick={() => setOpenNewChat(true)}
						/>
					</Popover>
				)}
				<CloseButton />
			</div>
			<ConnectedChatRoomList />
			<NewChatModal open={openNewChat} onClose={() => setOpenNewChat(false)} />
		</div>
	);
}

function ConversationView({ roomId }: { roomId: string }) {
	const { t } = useTranslate();
	const { chatClient, userMembership, chatContext, setChatContext } = useChat();
	// A deep link can name a room the first sync has not delivered yet.
	const [synced, setSynced] = useState(() => !!chatClient?.getRoom(roomId));

	useEffect(() => {
		if (!chatClient) return;
		const sync = () => {
			const room = chatClient.getRoom(roomId);
			setSynced(!!room);
			useChat.getState().setUserMembership(room?.getMyMembership() || null);
		};
		sync();
		chatClient.on(ClientEvent.Room, sync);
		chatClient.on(RoomEvent.MyMembership, sync);
		return () => {
			chatClient.removeListener(ClientEvent.Room, sync);
			chatClient.removeListener(RoomEvent.MyMembership, sync);
		};
	}, [chatClient, roomId]);

	const { data: context } = useQuery({
		queryKey: ["chat-client-context", roomId],
		queryFn: () =>
			axios
				.get<{ type: string; data: Record<string, unknown> | null }>(
					`/api/chat/rooms/${encodeURIComponent(roomId)}`,
				)
				.then((res) => res.data),
	});

	useEffect(() => {
		setChatContext(context ?? null);
	}, [context, setChatContext]);

	const isClosed =
		(chatContext?.type === "advice-request" ||
			chatContext?.type === "vacancy-application") &&
		String(chatContext.data?.status ?? "").toLowerCase() === "closed";

	return (
		<div className={styles.view}>
			<div className={`${styles.header} ${styles.conversationHeader}`}>
				<Button
					type="text"
					icon={<IconArrowLeft size={20} />}
					aria-label={t("chat.panel.back", "Back to messages")}
					onClick={() => useChat.getState().setSelectedRoomId(null)}
				/>
				<div className={styles.title}>
					<ChatTitle />
				</div>
				<CloseButton />
			</div>
			{synced ? (
				<div className={styles.content}>
					<ChatTopic />
					<ChatMessages />
					{userMembership === "join" && !isClosed && <ChatInput />}
				</div>
			) : (
				<div className={styles.center}>
					<Spin />
				</div>
			)}
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
				<ConversationView key={selectedRoomId} roomId={selectedRoomId} />
			)}
		</div>
	);
}
