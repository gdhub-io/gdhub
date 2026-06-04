import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { IconInfoCircle, IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import {
	Button,
	Drawer,
	Flex,
	Grid,
	Layout,
	Popover,
	Space,
	Spin,
	Typography,
} from "antd";
import axios from "axios";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { hasRole } from "@/helpers/user";
import styles from "./ChatModal.module.scss";
import ChatTopic from "./ChatTopic";
import NewChatModal from "./NewChatModal";
import { useChat } from "./useChat";

const { Text } = Typography;

const ChatTitle = dynamic(() => import("./ChatTitle"), { ssr: false });
const ChatRooms = dynamic(() => import("./ChatRooms"), { ssr: false });
const ChatMessages = dynamic(() => import("./ChatMessages"), { ssr: false });
const ChatInput = dynamic(() => import("./ChatInput"), { ssr: false });

export const ChatModal = () => {
	const screens = Grid.useBreakpoint();
	const [hasRooms, setHasRooms] = useState<boolean | null>(null);
	const [openNewChat, setOpenNewChat] = useState(false);
	const { data: session } = useSession();
	const isAdmin = hasRole(prismaClient.UserRole.Admin, { data: session });
	const {
		setChatContext,
		selectedRoomId,
		userMembership,
		chatContext,
		ready,
		openChatModal: open,
		setOpenChatModal,
	} = useChat();

	const onClose = () => setOpenChatModal(false);

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
		<>
			<Drawer
				open={open}
				className={styles.chatDrawer}
				classNames={{ wrapper: styles.chatDrawerWrapper }}
				onClose={onClose}
				title={<ChatTitle />}
				extra={
					<Space size={4}>
						{isAdmin && (
							<Button
								type="text"
								icon={<IconPlus size={16} />}
								onClick={() => setOpenNewChat(true)}
							>
								New chat
							</Button>
						)}
						<Popover
							trigger="click"
							placement="bottomRight"
							content={
								<Flex vertical gap={8} style={{ maxWidth: 280, fontSize: 13 }}>
									<span>
										Messages are transmitted over a secure connection (TLS) and
										accessible only to the conversation participants.
									</span>
									<span>Chat is powered by Matrix.</span>
								</Flex>
							}
						>
							<Button
								type="text"
								shape="circle"
								icon={<IconInfoCircle size={16} />}
							/>
						</Popover>
					</Space>
				}
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
					<Layout.Content
						style={{
							position: "relative",
							display: "flex",
							flexDirection: "column",
							minHeight: 0,
						}}
					>
						<ChatTopic />
						{showLoader && (
							<Flex
								justify="center"
								align="center"
								style={{
									flex: 1,
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
									flex: 1,
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
			<NewChatModal open={openNewChat} onClose={() => setOpenNewChat(false)} />
		</>
	);
};
