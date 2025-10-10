import { MenuOutlined } from "@ant-design/icons";
import { LuArrowUp } from "@react-icons/all-files/lu/LuArrowUp";
import { LuPlus } from "@react-icons/all-files/lu/LuPlus";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Drawer, Dropdown, Flex, Input, List, type MenuProps, Space } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { hasImageUrl, renderContentWithImageUrl } from "@/helpers/react-content";
import styles from "./style.module.scss";

interface AIAgentDrawerProps {
	open: boolean;
	onClose: () => void;
}

type Message = {
	id?: string;
	role: "human" | "ai" | "system" | "tool" | "function" | "remove";
	content: string;
};

export const AIAgentDrawer = ({ open, onClose }: AIAgentDrawerProps) => {
	const [threadId, setThreadId] = useState<string | null>(null);
	const [allowAutoAttach, setAllowAutoAttach] = useState(true);
	const [input, setInput] = useState("");
	const [assistantId, setAssistantId] = useState<string | null>(null);
	const [errorText, setErrorText] = useState("");
	const queryClient = useQueryClient();
	const messagesEndRef = useRef<HTMLDivElement | null>(null);
	const pathname = usePathname();

	// Load assistants and pick the first one by default
	const { data: assistantsData } = useQuery({
		queryKey: ["ai-assistants"],
		queryFn: async () => {
			const res = await axios.get("/api/user/ai/assistants", {
				params: { graphKey: "assistant@v1" },
			});
			return res.data as Array<{ assistant_id: string; name?: string }>;
		},
		enabled: open,
		staleTime: 60_000,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	});

	const { data: historyData } = useQuery({
		queryKey: ["ai-history"],
		queryFn: async () => {
			const res = await axios.get("/api/user/ai/history");
			return res.data as Array<{
				id: string;
				title: string;
				lastMessageAt: string;
				externalThreadId: string;
			}>;
		},
	});

	useEffect(() => {
		if (!assistantId && assistantsData?.length) {
			setAssistantId(assistantsData[0].assistant_id)
		}
	}, [assistantsData, assistantId])

	// const createThreadMutation = useMutation({
	// 	mutationFn: async () => {
	// 		const res = await axios.post('/api/user/ai/thread')
	// 		return res.data as { thread_id: string }
	// 	},
	// 	onSuccess: (data: any) => {
	// 		setThreadId(data.thread_id)
	// 	},
	// })

	const { data: stateData, isLoading: isLoadingState } = useQuery({
		queryKey: ["ai-state", threadId],
		queryFn: async () => {
			const params = threadId ? { threadId } : {};
			const res = await axios.get("/api/user/ai/state", { params });
			return res.data as { threadId: string; state: any; messages: Message[] } | null;
		},
		enabled: open && (Boolean(threadId) || allowAutoAttach),
		refetchOnWindowFocus: false,
	});

	// enable auto-attach on open if user didn't explicitly start a new chat
	useEffect(() => {
		if (open && threadId === null) {
			setAllowAutoAttach(true)
		}
	}, [open, threadId])

	// pick last threadId if allowed and not set
	useEffect(() => {
		if (open && allowAutoAttach && stateData?.threadId && !threadId) {
			setThreadId(stateData.threadId)
		}
	}, [open, allowAutoAttach, stateData?.threadId, threadId])

	const sendMessageMutation = useMutation({
		mutationFn: async (text: string) => {
			const res = await axios.post("/api/user/ai/send", {
				threadId,
				text,
				assistantId,
				route: pathname || "/",
			});
			return res.data as { threadId: string; values: any; messages: Message[] };
		},
		onMutate: async (text: string) => {
			await queryClient.cancelQueries({ queryKey: ["ai-state", threadId] });
			setErrorText("");
			type StateQueryResult = { state: any; messages: Message[] };
			const previous = queryClient.getQueryData(["ai-state", threadId]) as
				| StateQueryResult
				| undefined;
			const optimistic: Message = { id: `optimistic-${Date.now()}`, role: "human", content: text };
			queryClient.setQueryData(["ai-state", threadId], (oldData: any) => {
				const oldMessages: Message[] = oldData?.messages ?? [];
				return { ...(oldData || {}), messages: [...oldMessages, optimistic] };
			});
			return { previous };
		},
		onSuccess: (data) => {
			if (!threadId && data?.threadId) {
				setThreadId(data.threadId);
				setAllowAutoAttach(true);
			}
			queryClient.invalidateQueries({ queryKey: ["ai-state", data?.threadId || threadId] });
			queryClient.invalidateQueries({ queryKey: ["ai-history"] });
		},
		onError: (err: any, _text, context) => {
			const msg = err?.response?.data?.message || err?.message || "Unknown error";
			setErrorText(msg);
			if (context?.previous) {
				queryClient.setQueryData(["ai-state", threadId], context.previous);
			}
		},
	});

	const [messages, setMessages] = useState<Message[]>([]);

	useEffect(() => {
		if (!stateData) return;
		if (!allowAutoAttach && !threadId) return;
		setMessages(
			stateData?.messages.filter(
				(message: Message) => Boolean(message.content) && ["ai", "human"].includes(message.role),
			) ?? [],
		);
	}, [stateData, allowAutoAttach, threadId]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages, open])

	const historyMenuItems: MenuProps["items"] = useMemo(() => {
		return (
			historyData?.map((item) => ({
				label:
					item.title || "Chat " + " at " + dayjs(item.lastMessageAt).format("DD.MM.YYYY HH:mm"),
				key: item.externalThreadId,
			})) ?? []
		);
	}, [historyData]);

	const handleNewChat = () => {
		setAllowAutoAttach(false);
		setThreadId(null);
		setMessages([]);
		queryClient.removeQueries({ queryKey: ["ai-state"] });
	};

	const handleHistoryItemClick = (item: any) => {
		setAllowAutoAttach(true);
		setThreadId(item.key);
	};

	return (
		<Drawer
			classNames={{
				wrapper: styles.agentDrawerWrapper,
				content: styles.agentDrawerContent,
				footer: styles.agentDrawerFooter,
			}}
			placement="bottom"
			height={"auto"}
			open={open}
			onClose={onClose}
			title="Triangle Assistant"
			extra={
				<Space>
					<Button size="small" type="text" icon={<LuPlus />} onClick={handleNewChat}>
						New chat
					</Button>
					<Dropdown
						menu={{
							items: historyMenuItems,
							onClick: handleHistoryItemClick,
							selectedKeys: threadId ? [threadId] : [],
						}}
						trigger={["click"]}
					>
						<Button size="small" type="text" icon={<MenuOutlined />}></Button>
					</Dropdown>
				</Space>
			}
			closeIcon={null}
			footer={
				<Flex gap={16} align="center" className={styles.agentDrawerInputWrapper}>
					<Input.TextArea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						autoSize={{ minRows: 1, maxRows: 3 }}
						variant="borderless"
						placeholder="Ask me anything..."
						onPressEnter={(e) => {
							if (!e.shiftKey) {
								e.preventDefault();
								if (input.trim() && !sendMessageMutation.isPending) {
									sendMessageMutation.mutate(input.trim());
									setInput("");
								}
							}
						}}
					/>
					<Button
						type="primary"
						shape="circle"
						icon={<LuArrowUp />}
						className={styles.agentDrawerInputButton}
						disabled={!input.trim() || sendMessageMutation.isPending}
						onClick={() => {
							sendMessageMutation.mutate(input.trim());
						}}
					/>
				</Flex>
			}
		>
			<Flex vertical gap={16}>
				<div className={styles.messagesScroll}>
					{messages.length > 0 ? (
						<List
							dataSource={messages}
							split={false}
							rowKey="id"
							renderItem={(item: Message, index: number) => {
								const isHuman = item.role === "human";
								const authorLabel = isHuman ? "you" : item.role;
								const preparedContent = hasImageUrl(item.content)
									? renderContentWithImageUrl(item.content)
									: item.content;
								return (
									<List.Item
										key={item.id || `${item.role}-${index}`}
										className={`${styles.message} ${isHuman ? styles.messageHuman : styles.messageOther}`}
									>
										<div className={styles.messageWrapper}>
											<div
												className={styles.messageAuthor}
												style={{ textAlign: isHuman ? "right" : "left" }}
											>
												{authorLabel}
											</div>
											<div className={styles.messageContent}>{preparedContent}</div>
										</div>
									</List.Item>
								);
							}}
						/>
					) : (
						<div className={styles.emptyMessages}>Write your first message</div>
					)}
					{sendMessageMutation.isPending && <div className={styles.thinking}>thinking...</div>}
					{errorText && <div className={styles.errorText}>{errorText}</div>}
					<div ref={messagesEndRef} />
				</div>
			</Flex>
		</Drawer>
	);
};
