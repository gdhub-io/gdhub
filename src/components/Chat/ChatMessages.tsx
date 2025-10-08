import { useEffect, useRef, useState } from 'react'
import { UserOutlined } from '@ant-design/icons'
import { Bubble, BubbleProps, Welcome, Prompts } from '@ant-design/x'
import { BubbleDataType } from '@ant-design/x/es/bubble/BubbleList'
import { Flex, GetRef } from 'antd'
import dayjs from 'dayjs'
import { MatrixEvent, RoomEvent } from 'matrix-js-sdk'
import styles from './ChatModal.module.scss'
import { useChat } from './useChat'

const availableMessageTypes = [
	'm.room.message',
	'm.room.name',
	'm.room.topic',
	'm.room.create',
	'm.room.redaction',
	'm.room.member',
]

export default function ChatMessages() {
	const listRef = useRef<GetRef<typeof Bubble.List>>(null)
	const { selectedRoomId, chatSession, chatClient, ready } = useChat()
	const [messages, setMessages] = useState<MatrixEvent[]>([])
	const [preparedMessages, setPreparedMessages] = useState<BubbleDataType[]>([])
	const [isJoining, setIsJoining] = useState(false)
	const [isDeclining, setIsDeclining] = useState(false)
	// const queryClient = useQueryClient()

	// const { data: messages } = useQuery({
	// 	queryKey: ['chat-messages', selectedRoomId],
	// 	queryFn: () => axios.get<any[]>(`/api/chat/rooms/${selectedRoomId}/messages`).then((res) => res.data),
	// 	enabled: !!selectedRoomId,
	// })

	// const { data: rooms } = useQuery({
	// 	queryKey: ['chat-rooms', chatSession?.userId],
	// 	queryFn: async () => axios.get<any[]>(`/api/chat/rooms`).then((res) => res.data),
	// 	enabled: !!chatSession?.userId,
	// })

	useEffect(() => {
		if (!chatClient || !ready || !selectedRoomId) return

		const room = chatClient.getRoom(selectedRoomId)
		if (!room) {
			setMessages([])
			return
		}

		const initial = room.getLiveTimeline().getEvents().slice(-50)
		setMessages(initial)

		const handleTimeline = (event: MatrixEvent, evRoom: any, toStartOfTimeline?: boolean) => {
			if (toStartOfTimeline) return
			if (!evRoom || evRoom.roomId !== selectedRoomId) return
			setMessages((prev) => [...prev, event])
		}

		chatClient.on(RoomEvent.Timeline, handleTimeline)
		return () => {
			chatClient.removeListener(RoomEvent.Timeline, handleTimeline)
		}
	}, [chatClient, ready, selectedRoomId])

	useEffect(() => {
		// Scroll to bottom on new messages
		try {
			listRef.current?.scrollTo?.({ offset: Number.MAX_SAFE_INTEGER })
		} catch {}
	}, [preparedMessages])

	console.log('[chat] messages', messages)

	useEffect(() => {
		if (!Array.isArray(messages)) return
		setPreparedMessages(
			messages
				.filter((ev) => availableMessageTypes.includes(ev.getType()))
				.map((ev) => {
					const type = ev.getType()
					const senderId = ev.getSender()
					const time = dayjs(ev.getTs()).format('HH:mm')
					const key = ev.getId() || `${ev.getTs()}-${Math.random()}`

					if (type === 'm.room.message') {
						const content: any = ev.getContent() || {}
						const text = content.body || content.formatted_body || JSON.stringify(content)
						const chatUser = chatClient?.getUser(senderId as string)
						return {
							key,
							role: senderId === chatClient?.getUserId() ? 'user' : 'member',
							content: text,
							title: chatUser?.displayName,
							avatarUrl: chatUser?.avatarUrl,
							time,
						}
					}

					// Non-message/system event
					const systemText = buildSystemHeader(ev)

					return {
						key,
						role: 'system',
						content: '',
						systemText,
						time,
					}
				})
		)
	}, [messages, chatClient])

	function buildSystemHeader(ev: MatrixEvent): string {
		const type = ev.getType()
		const senderId = ev.getSender()
		const content: any = ev.getContent() || {}
		const userDisplay = chatClient?.getUser(senderId || '')?.displayName || 'Unknown'
		const invitedDisplay = ev?.getContent()?.displayname || 'User'

		switch (type) {
			case 'm.room.member': {
				const membership = content?.membership
				if (membership === 'join') return `${userDisplay} joined the room`
				if (membership === 'leave') return `${userDisplay} left the room`
				if (membership === 'invite') return `${invitedDisplay} was invited`
				if (membership === 'ban') return `${userDisplay} was banned`
				return `${userDisplay} membership changed`
			}
			case 'm.room.name':
				return `Room name changed to "${content?.name || ''}"`
			case 'm.room.topic':
				return `Room topic updated`
			case 'm.room.create':
				return `Room created by ${userDisplay}`
			case 'm.room.redaction':
				return `An event was redacted`
			case 'm.room.power_levels':
				return `Power levels updated`
			default:
				return `Event: ${type}`
		}
	}

	const renderRoles = (bubbleData: BubbleDataType, index: number) => {
		// Render message content with line breaks preserved
		const RenderIndex: BubbleProps['messageRender'] = (content) => (
			<Flex style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{content}</Flex>
		)

		switch (bubbleData.role) {
			case 'member':
				return {
					placement: 'start' as const,
					header: <div style={{ fontSize: 12, color: '#9c9a9a' }}>{(bubbleData as any).title}</div>,
					avatar: (bubbleData as any).avatarUrl
						? { src: (bubbleData as any).avatarUrl }
						: { icon: <UserOutlined />, style: { background: '#fde3cf' } },
					typing: { step: 5, interval: 20 },
					footer: <div style={{ fontSize: 10, color: '#cccccc' }}>{(bubbleData as any).time}</div>,
					messageRender: RenderIndex,
				}
			case 'user':
				return {
					placement: 'end' as const,
					header: <div style={{ fontSize: 12, color: '#9c9a9a' }}>{(bubbleData as any).title}</div>,
					avatar: (bubbleData as any).avatarUrl
						? { src: (bubbleData as any).avatarUrl }
						: { icon: <UserOutlined />, style: { background: '#aad068' } },
					footer: <div style={{ fontSize: 10, color: '#cccccc' }}>{(bubbleData as any).time}</div>,
					messageRender: RenderIndex,
				}
			case 'system':
				return {
					placement: 'start' as const,
					header: (
						<div style={{ fontSize: 12, color: '#9c9a9a', width: '100%', textAlign: 'center' }}>
							{(bubbleData as any).systemText}
						</div>
					),
					className: styles.systemMessage,
					messageRender: undefined,
					footer: (
						<div style={{ fontSize: 10, color: '#cccccc', textAlign: 'center', width: '100%' }}>
							{(bubbleData as any).time}
						</div>
					),
				}
			default:
				return { messageRender: RenderIndex }
		}
	}

	const room = selectedRoomId ? chatClient?.getRoom(selectedRoomId) : null
	const myMembership = room?.getMyMembership()

	if (myMembership === 'invite') {
		return (
			<div className={styles.chatMessages} style={{ paddingInline: 16 }}>
				<Welcome title="Invitation pending" description="You were invited to this chat. Accept to start messaging." />
				<div style={{ marginTop: 12 }}>
					<Prompts
						title="Actions"
						items={[
							{ key: 'accept', label: 'Accept invite' },
							{ key: 'decline', label: 'Decline invite' },
						]}
						onItemClick={async ({ data }) => {
							if (!selectedRoomId || !chatClient) return
							if (data.key === 'accept') {
								try {
									setIsJoining(true)
									await chatClient.joinRoom(selectedRoomId)
								} finally {
									setIsJoining(false)
								}
							}
							if (data.key === 'decline') {
								try {
									setIsDeclining(true)
									await chatClient.leave(selectedRoomId)
								} finally {
									setIsDeclining(false)
								}
							}
						}}
						styles={{
							item: {
								cursor: isJoining || isDeclining ? 'not-allowed' : 'pointer',
								opacity: isJoining || isDeclining ? 0.6 : 1,
							},
						}}
					/>
				</div>
			</div>
		)
	}

	return (
		<Bubble.List
			ref={listRef}
			style={{ paddingInline: 16 }}
			className={styles.chatMessages}
			items={preparedMessages}
			roles={renderRoles}
		/>
	)
}
