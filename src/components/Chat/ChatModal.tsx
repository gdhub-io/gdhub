import { useQuery } from "@tanstack/react-query";
import { Drawer, Flex, Grid, Layout, Typography } from "antd";
import axios from "axios";
import { ClientEvent } from "matrix-js-sdk";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { createMatrixClient } from "@/lib/matrix-client";
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
	const [hasRooms, setHasRooms] = useState(false);
	const { data: session } = useSession();
	const {
		chatClient,
		setChatClient,
		setReady,
		setChatContext,
		selectedRoomId,
		setSelectedRoomId,
		userMembership,
	} = useChat();

	const { data: clientSessionData } = useQuery({
		queryKey: ["chat-client-session", session?.user.id],
		queryFn: () =>
			axios.post("/api/chat/session", undefined).then((res) => res.data),
		enabled: !!session?.user.id && open,
	});

	const { data: clientContextData } = useQuery({
		queryKey: ["chat-client-context", session?.user.id, selectedRoomId],
		queryFn: () =>
			axios
				.get<{ type: string; data: Record<string, any> | null }>(
					`/api/chat/rooms/${selectedRoomId}`,
				)
				.then((res) => res.data),
		enabled: !!session?.user.id && open && !!selectedRoomId,
	});

	useEffect(() => {
		if (initialRoomId && open) {
			setSelectedRoomId(initialRoomId);
		}
	}, [initialRoomId, open]);

	useEffect(() => {
		if (clientContextData) {
			setChatContext(clientContextData);
		}
	}, [clientContextData]);

	// start chat for client session
	useEffect(() => {
		if (!clientSessionData?.token) return;

		createMatrixClient({
			accessToken: clientSessionData.token,
			userId: clientSessionData.userId,
		})
			.then((client) => {
				client.startClient();

				setChatClient(client);

				client.once(ClientEvent.Sync, (state) => {
					if (state === "PREPARED") {
						console.log("prepared");
						setReady(true);
					} else {
						console.log("[chat] sync state", state);
					}
				});
			})
			.catch((error) => {
				console.error(error);
			});

		return () => {
			chatClient?.stopClient();
			setChatClient(null);
			setReady(false);
		};
	}, [clientSessionData?.token]);

	return (
		<Drawer
			open={open}
			className={styles.chatDrawer}
			classNames={{ wrapper: styles.chatDrawerWrapper }}
			onClose={onClose}
			title={<ChatTitle />}
			width={screens.lg ? 720 : "100%"}
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
					{!hasRooms && (
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

					{hasRooms && (
						<div className={styles.chatContent}>
							<ChatMessages />
							{userMembership === "join" && <ChatInput />}
						</div>
					)}
				</Layout.Content>
			</Layout>
		</Drawer>
	);
};
