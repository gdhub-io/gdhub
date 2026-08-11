import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { App, Button, Flex, Modal, message, Typography } from "antd";
import axios from "axios";
import Link from "next/link";
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

type VacancyChatContext = {
	id?: string;
	status?: string;
	vacancy?: { id?: string; title?: string | null } | null;
	project?: { id?: string; name?: string | null } | null;
};

export default function ChatTopic() {
	// `App.useApp()` rather than the static `Modal.confirm`: a detached root
	// cannot see the ConfigProvider above it, so the static dialog ignored the
	// app's theme.
	const { modal } = App.useApp();

	const { t } = useTranslate();
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

	const isAdviceRequest = chatContext?.type === "advice-request";
	const isVacancyChat = chatContext?.type === "vacancy-application";

	// Only contextual chats have a topic header; plain direct chats don't.
	if (!chatContext || (!isAdviceRequest && !isVacancyChat)) return null;

	const status = ((chatContext.data?.status as string) || "").toLowerCase();
	const isResolved = status === "closed";

	const handleResolveClick = () => {
		if (!selectedRoomId) return;
		modal.confirm({
			title: "Archive this chat?",
			content:
				"Once archived, the chat will move to the archive and new messages will be disabled.",
			okText: "Yes, archive chat",
			cancelText: "Cancel",
			onOk: () => resolveMutation.mutateAsync().catch(() => undefined),
		});
	};

	let header: React.ReactNode;
	if (isAdviceRequest) {
		const adviceData = (chatContext.data || {}) as AdviceRequestContext;
		header = (
			<>
				<Text strong ellipsis>
					Topic: {adviceData.topic || "—"}
				</Text>
				<Text ellipsis>Project: {adviceData.project?.name || "—"}</Text>
				<Text ellipsis>Comment: {adviceData.comment || "—"}</Text>
			</>
		);
	} else {
		const vacancyData = (chatContext.data || {}) as VacancyChatContext;
		header = (
			<>
				<Text strong ellipsis>
					Open position: {vacancyData.vacancy?.title || "—"}
				</Text>
				<Text ellipsis>Project: {vacancyData.project?.name || "—"}</Text>
				{!!vacancyData.vacancy?.id && (
					<Link href={`/job/${vacancyData.vacancy.id}`} target="_blank">
						<Button size="small" style={{ marginTop: 4 }}>
							{t("chat.topic.openPositionPage", "Open position page")}
						</Button>
					</Link>
				)}
			</>
		);
	}

	return (
		<div className={styles.chatTopicContainer}>
			<Flex
				align="center"
				justify="space-between"
				gap={16}
				style={{ width: "100%", flexWrap: "wrap" }}
			>
				<Flex vertical style={{ flex: 1, minWidth: 0 }}>
					{header}
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
						{isAdviceRequest ? "Question Resolved" : "Archive chat"}
					</Button>
				)}
			</Flex>
		</div>
	);
}
