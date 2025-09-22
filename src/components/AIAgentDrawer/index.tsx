import { useEffect, useMemo, useRef, useState } from 'react'
import { MenuOutlined } from '@ant-design/icons'
import { LuArrowUp } from '@react-icons/all-files/lu/LuArrowUp'
import { LuPlus } from '@react-icons/all-files/lu/LuPlus'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Drawer, Dropdown, Flex, Input, List, MenuProps, Space } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import { useRouter } from 'next/router'
import styles from './style.module.scss'

interface AIAgentDrawerProps {
	open: boolean
	onClose: () => void
}

type Message = {
	id?: string
	role: 'human' | 'ai' | 'system' | 'tool' | 'function' | 'remove'
	content: string
}

export const AIAgentDrawer = ({ open, onClose }: AIAgentDrawerProps) => {
	const [threadId, setThreadId] = useState<string | null>(null)
	const [input, setInput] = useState('')
	const [assistantId, setAssistantId] = useState<string | null>(null)
	const [errorText, setErrorText] = useState('')
	const queryClient = useQueryClient()
	const messagesEndRef = useRef<HTMLDivElement | null>(null)
	const router = useRouter()

	// Load assistants and pick the first one by default
	const { data: assistantsData } = useQuery({
		queryKey: ['ai-assistants'],
		queryFn: async () => {
			const res = await axios.get('/api/user/ai/assistants', { params: { graphId: 'chat' } })
			return res.data as Array<{ assistant_id: string; name?: string }>
		},
		staleTime: 60_000,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	})

	const { data: historyData } = useQuery({
		queryKey: ['ai-history'],
		queryFn: async () => {
			const res = await axios.get('/api/user/ai/history')
			return res.data as Array<{ id: string; title: string; lastMessageAt: string }>
		},
	})

	useEffect(() => {
		if (!assistantId && assistantsData?.length) {
			setAssistantId(assistantsData[0].assistant_id)
		}
	}, [assistantsData])

	const createThreadMutation = useMutation({
		mutationFn: async () => {
			const res = await axios.post('/api/user/ai/thread')
			return res.data as { thread_id: string }
		},
		onSuccess: (data: any) => {
			setThreadId(data.thread_id)
		},
	})

	useEffect(() => {
		if (open && !threadId && !createThreadMutation.isPending) {
			createThreadMutation.mutate()
		}
	}, [open])

	const { data: stateData, isLoading: isLoadingState } = useQuery({
		queryKey: ['ai-state', threadId],
		queryFn: async () => {
			const res = await axios.get('/api/user/ai/state', { params: { threadId } })
			return res.data as { state: any; messages: Message[] }
		},
		enabled: Boolean(threadId && open),
		refetchOnWindowFocus: false,
	})

	const sendMessageMutation = useMutation({
		mutationFn: async (text: string) => {
			const res = await axios.post('/api/user/ai/send', { threadId, text, assistantId, route: router.asPath })
			return res.data as { values: any; messages: Message[] }
		},
		onMutate: async (text: string) => {
			await queryClient.cancelQueries({ queryKey: ['ai-state', threadId] })
			setErrorText('')
			type StateQueryResult = { state: any; messages: Message[] }
			const previous = queryClient.getQueryData(['ai-state', threadId]) as StateQueryResult | undefined
			const optimistic: Message = { id: `optimistic-${Date.now()}`, role: 'human', content: text }
			queryClient.setQueryData(['ai-state', threadId], (oldData: any) => {
				const oldMessages: Message[] = oldData?.messages ?? []
				return { ...(oldData || {}), messages: [...oldMessages, optimistic] }
			})
			return { previous }
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['ai-state', threadId] })
		},
		onError: (err: any, _text, context) => {
			const msg = err?.response?.data?.message || err?.message || 'Unknown error'
			setErrorText(msg)
			if (context?.previous) {
				queryClient.setQueryData(['ai-state', threadId], context.previous)
			}
		},
	})

	const messages: Message[] = useMemo(
		() =>
			stateData?.messages.filter(
				(message: Message) => Boolean(message.content) && ['ai', 'human'].includes(message.role)
			) ?? [],
		[stateData]
	)

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages.length, open])

	const historyMenuItems: MenuProps['items'] = useMemo(() => {
		return (
			historyData?.map((item) => ({
				label:
					item.title || 'Chat ' + item.id.slice(-8) + ' at ' + dayjs(item.lastMessageAt).format('DD.MM.YYYY HH:mm'),
				key: item.id,
			})) ?? []
		)
	}, [])

	return (
		<Drawer
			classNames={{
				wrapper: styles.agentDrawerWrapper,
				content: styles.agentDrawerContent,
				footer: styles.agentDrawerFooter,
			}}
			placement="bottom"
			height={'auto'}
			open={open}
			onClose={onClose}
			title="Triangle Assistant"
			extra={
				<Space>
					<Button size="small" icon={<LuPlus />} onClick={() => router.push('/user/ai')}>
						New chat
					</Button>
					<Dropdown menu={{ items: historyMenuItems }} trigger={['click']}>
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
								e.preventDefault()
								if (input.trim() && threadId && !sendMessageMutation.isPending) {
									sendMessageMutation.mutate(input.trim())
									setInput('')
								}
							}
						}}
					/>
					<Button
						type="primary"
						shape="circle"
						icon={<LuArrowUp />}
						className={styles.agentDrawerInputButton}
						disabled={!input.trim() || !threadId || sendMessageMutation.isPending}
						onClick={() => {
							if (input.trim() && threadId) {
								sendMessageMutation.mutate(input.trim())
								setInput('')
							}
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
							renderItem={(item: Message) => {
								const isHuman = item.role === 'human'
								const authorLabel = isHuman ? 'you' : item.role
								return (
									<List.Item
										key={item.id || `${item.role}-${item.content}`}
										className={`${styles.message} ${isHuman ? styles.messageHuman : styles.messageOther}`}
									>
										<div className={styles.messageWrapper}>
											<div className={styles.messageAuthor} style={{ textAlign: isHuman ? 'right' : 'left' }}>
												{authorLabel}
											</div>
											<div className={styles.messageContent}>{item.content}</div>
										</div>
									</List.Item>
								)
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
	)
}
