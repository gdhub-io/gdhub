import { useEffect, useRef, useState } from 'react'
import { UserOutlined } from '@ant-design/icons'
import { Bubble, BubbleProps, Welcome } from '@ant-design/x'
import { BubbleDataType } from '@ant-design/x/es/bubble/BubbleList'
import { Flex, GetRef } from 'antd'
import dayjs from 'dayjs'
import { MatrixEvent, RoomEvent } from 'matrix-js-sdk'
import styles from './ChatModal.module.scss'
import { useChat } from './useChat'

export default function ChatMessages() {
	const listRef = useRef<GetRef<typeof Bubble.List>>(null)
	const { selectedRoomId, chatSession, chatClient, ready } = useChat()
	const [messages, setMessages] = useState<MatrixEvent[]>([])
	const [preparedMessages, setPreparedMessages] = useState<BubbleDataType[]>([])
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

		const initial = room
			.getLiveTimeline()
			.getEvents()
			.filter((e) => e.getType() === 'm.room.message')
			.slice(-50)
		setMessages(initial)

		const handleTimeline = (event: MatrixEvent, evRoom: any, toStartOfTimeline?: boolean) => {
			if (toStartOfTimeline) return
			if (!evRoom || evRoom.roomId !== selectedRoomId) return
			if (event.getType() !== 'm.room.message') return
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

	// const currentRoom = (rooms || []).find((r) => r.roomId === selectedRoomId)

	// Invitation actions will be wired later when membership state is integrated

	useEffect(() => {
		if (!Array.isArray(messages)) return
		setPreparedMessages(
			messages.map((ev) => {
				const content: any = ev.getContent() || {}
				const senderId = ev.getSender()
				const text = content.body || content.formatted_body || JSON.stringify(content)
				const time = dayjs(ev.getTs()).format('HH:mm')

				const chatUser = chatClient?.getUser(senderId as string)

				return {
					key: ev.getId() || `${ev.getTs()}-${Math.random()}`,
					role: senderId === chatClient?.getUserId() ? 'user' : 'member',
					content: text,
					title: senderId,
					avatarUrl: chatUser?.avatarUrl,
					displayName: chatUser?.displayName,
					time,
				}
			})
		)
	}, [messages, chatSession?.userId])

	const renderRoles = (bubbleData: BubbleDataType, index: number) => {
		const RenderIndex: BubbleProps['messageRender'] = (content) => <Flex>{content}</Flex>

		switch (bubbleData.role) {
			case 'member':
				return {
					placement: 'start' as const,
					header: <div style={{ fontSize: 12, color: '#9c9a9a' }}>{(bubbleData as any).displayName}</div>,
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
					header: <div style={{ fontSize: 12, color: '#9c9a9a' }}>{(bubbleData as any).displayName}</div>,
					avatar: (bubbleData as any).avatarUrl
						? { src: (bubbleData as any).avatarUrl }
						: { icon: <UserOutlined />, style: { background: '#aad068' } },
					footer: <div style={{ fontSize: 10, color: '#cccccc' }}>{(bubbleData as any).time}</div>,
					messageRender: RenderIndex,
				}
			default:
				return { messageRender: RenderIndex }
		}
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

	return (
		<>
			{Array.isArray(messages) && messages.length === 0 ? (
				<div className={styles.chatMessages} style={{ paddingInline: 16 }}>
					<Welcome title="No messages yet" description="This chat has no messages yet. You can write the first one." />
				</div>
			) : (
				<Bubble.List
					ref={listRef}
					style={{ paddingInline: 16 }}
					className={styles.chatMessages}
					items={preparedMessages}
					roles={renderRoles}
				/>
			)}
		</>
	)
}
