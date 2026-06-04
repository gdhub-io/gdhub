import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Flex, Modal, message, Typography } from "antd";
import axios from "axios";
import styles from "./ChatModal.module.scss";
import { useChat } from "./useChat";

const { Text } = Typography;

type AdviceRequestContext = {
	id?: string;
	topic?: string | null;
	comment?: string | null;
	status?: string;
	project?: {
		id: string;
		name?: string | null;
		coverImage?: string | null;
	} | null;
};

export default function ChatTopic() {
	const { chatContext, selectedRoomId, setChatContext } = useChat();
	const queryClient = useQueryClient();

	const resolveMutation = useMutation({
		mutationFn: async () => {
			if (!selectedRoomId) throw new Error("No room selected");
			const { data } = await axios.put(
				`/api/chat/rooms/${selectedRoomId}/resolve`,
			);
			return data;
		},
		onSuccess: (data) => {
			if (data) {
				setChatContext(data);
			}
			message.success("Chat archived");
			queryClient.invalidateQueries({ queryKey: ["chat-client-context"] });
		},
		onError: () => {
			message.error("Failed to archive chat");
		},
	});

	// this section only makes sense for the expert advice-request chat;
	// regular direct chats have no topic/project/comment
	if (!chatContext || chatContext.type !== "advice-request") return null;

	const adviceData = (chatContext.data || {}) as AdviceRequestContext;
	const isResolved = (adviceData.status || "").toLowerCase() === "closed";

	const handleResolveClick = () => {
		if (!selectedRoomId) return;
		Modal.confirm({
			title: "Archive this chat?",
			content:
				"Once archived, the chat will move to the archive and new messages will be disabled.",
			okText: "Yes, archive chat",
			cancelText: "Cancel",
			onOk: () => resolveMutation.mutateAsync().catch(() => undefined),
		});
	};

	return (
		<div className={styles.chatTopicContainer}>
			<Flex
				align="center"
				justify="space-between"
				gap={16}
				style={{ width: "100%", flexWrap: "wrap" }}
			>
				<Flex vertical style={{ flex: 1, minWidth: 0 }}>
					<Text strong ellipsis>
						Topic: {adviceData.topic || "—"}
					</Text>
					<Text ellipsis>Project: {adviceData.project?.name || "—"}</Text>
					<Text ellipsis>Comment: {adviceData.comment || "—"}</Text>
					{isResolved && (
						<Text type="secondary">
							This chat is archived. New messages are disabled.
						</Text>
					)}
				</Flex>
				{!isResolved && (
					<Button
						type="primary"
						ghost
						onClick={handleResolveClick}
						loading={resolveMutation.status === "pending"}
						disabled={!selectedRoomId}
					>
						Question Resolved
					</Button>
				)}
			</Flex>
		</div>
	);
}
