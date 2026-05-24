import { useQuery } from "@tanstack/react-query";
import { Drawer, Flex, Grid, Layout, Spin, Typography } from "antd";
import axios from "axios";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import styles from "./ChatModal.module.scss";
import ChatTopic from "./ChatTopic";
import { useChat } from "./useChat";

const { Text } = Typography;

const ChatTitle = dynamic(() => import("./ChatTitle"), { ssr: false });
const ChatRooms = dynamic(() => import("./ChatRooms"), { ssr: false });
const ChatMessages = dynamic(() => import("./ChatMessages"), { ssr: false });
const ChatInput = dynamic(() => import("./ChatInput"), { ssr: false });

type ChatModalProps = {
	open: boolean;
	onClose: () => void;
	initialRoomId?: string | null;
};

export const ChatModal = ({
	open = false,
	onClose,
	initialRoomId,
}: ChatModalProps) => {
	const screens = Grid.useBreakpoint();
	const [hasRooms, setHasRooms] = useState<boolean | null>(null);
	const { data: session } = useSession();
	const {
		setChatContext,
		selectedRoomId,
		setSelectedRoomId,
		userMembership,
		chatContext,
		ready,
	} = useChat();

	const { data: clientContextData } = useQuery({
		queryKey: ["chat-client-context", session?.user.id, selectedRoomId],
		queryFn: () =>
			axios
				.get<{ type: string; data: Record<string, unknown> | null }>(
					`/api/chat/rooms/${selectedRoomId}`,
				)
				.then((res) => res.data),
		enabled: !!session?.user.id && open && !!selectedRoomId,
	});

	useEffect(() => {
		if (initialRoomId && open) {
			setSelectedRoomId(initialRoomId);
		}
	}, [initialRoomId, open, setSelectedRoomId]);

	useEffect(() => {
		if (!open) {
			setHasRooms(null);
		}
	}, [open]);

	useEffect(() => {
		if (clientContextData) {
			setChatContext(clientContextData);
		}
	}, [clientContextData, setChatContext]);

	const isChatArchived =
		chatContext?.type === "advice-request" &&
		(
			(chatContext.data as { status?: string } | null)?.status || ""
		).toLowerCase() === "closed";

	const showLoader = !ready || hasRooms === null;
	const showEmptyState = ready && hasRooms === false;
	const showChat = ready && hasRooms;

	return (
		<Drawer
			open={open}
			className={styles.chatDrawer}
			classNames={{ wrapper: styles.chatDrawerWrapper }}
			onClose={onClose}
			title={<ChatTitle />}
			size={screens.lg ? 720 : "100%"}
			styles={{
				body: { padding: 0, display: "flex", flexDirection: "column" },
			}}
		>
			<Layout>
				<Layout.Sider
					breakpoint="lg"
					collapsedWidth="110"
					theme="light"
					className={styles.chatRoomsSider}
				>
					<ChatRooms onReady={(data) => setHasRooms(data.count > 0)} />
				</Layout.Sider>
				<Layout.Content style={{ position: "relative" }}>
					<ChatTopic />
					{showLoader && (
						<Flex
							justify="center"
							align="center"
							style={{
								height: "100%",
								padding: "16px",
								maxWidth: "400px",
								margin: "0 auto",
							}}
						>
							<Spin description="Loading chats..." />
						</Flex>
					)}
					{showEmptyState && (
						<Flex
							justify="center"
							align="center"
							style={{
								height: "100%",
								padding: "16px",
								maxWidth: "400px",
								margin: "0 auto",
							}}
						>
							<Text type="secondary">
								You don&apos;t have any rooms yet. Connect to experts or other
								community members to start a conversation.
							</Text>
						</Flex>
					)}

					{showChat && (
						<div className={styles.chatContent}>
							<ChatMessages />
							{userMembership === "join" && !isChatArchived && <ChatInput />}
						</div>
					)}
				</Layout.Content>
			</Layout>
		</Drawer>
	);
};
