import { useEffect, useRef, useState } from 'react'
import { UserOutlined } from '@ant-design/icons'
import { Bubble, BubbleProps, Welcome, Prompts } from '@ant-design/x'
import { BubbleDataType } from '@ant-design/x/es/bubble/BubbleList'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Flex, GetRef } from 'antd'
import axios from 'axios'
import { MatrixEvent, RoomEvent } from 'matrix-js-sdk'
import styles from './ChatModal.module.scss'
import { useChat } from './useChat'

export default function ChatMessages() {
	const listRef = useRef<GetRef<typeof Bubble.List>>(null)
	const { selectedRoomId, chatSession, chatClient, ready } = useChat()
	const [messages, setMessages] = useState<MatrixEvent['event'][]>([])
	const [preparedMessages, setPreparedMessages] = useState<BubbleDataType[]>([])
	const queryClient = useQueryClient()

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
		if (!chatClient || !ready) return
		chatClient.on(RoomEvent.Timeline, (event) => {
			setMessages((prev) => [...prev, event.event])
		})

		return () => {
			chatClient.removeListener(RoomEvent.Timeline, (event) => {
				setMessages((prev) => [...prev, event.event])
			})
		}
	}, [chatClient, ready])

	useEffect(() => {
		console.log('messages', messages)
	}, [messages])

	// const currentRoom = (rooms || []).find((r) => r.roomId === selectedRoomId)
	const myMembership = 'invite' // currentRoom?.myMembership as string | undefined

	const { mutateAsync: acceptInvite, isPending: isJoining } = useMutation({
		mutationFn: async () => {
			if (!selectedRoomId) throw new Error('No room selected')
			await axios.post(`/api/chat/rooms/${selectedRoomId}/join`)
		},
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['chat-rooms', chatSession?.userId] }),
				queryClient.invalidateQueries({ queryKey: ['chat-messages', selectedRoomId] }),
			])
		},
	})

	const { mutateAsync: declineInvite, isPending: isLeaving } = useMutation({
		mutationFn: async () => {
			if (!selectedRoomId) throw new Error('No room selected')
			await axios.post(`/api/chat/rooms/${selectedRoomId}/leave`)
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ['chat-rooms', chatSession?.userId] })
		},
	})

	// useEffect(() => {
	// 	if (messages) {
	// 		setPreparedMessages(
	// 			messages.map((message) => ({
	// 				key: message.eventId,
	// 				role: message.sender === chatSession?.userId ? 'user' : 'member',
	// 				content: message.content?.body || message.content?.text || JSON.stringify(message.content),
	// 				avatarSrc: message.senderAvatarUrl,
	// 				title: message.senderDisplayName,
	// 				time: dayjs(message.ts).format('HH:mm'),
	// 			}))
	// 		)
	// 	}
	// }, [messages, chatSession?.userId])

	const renderRoles = (bubbleData: BubbleDataType, index: number) => {
		const RenderIndex: BubbleProps['messageRender'] = (content) => <Flex>{content}</Flex>

		switch (bubbleData.role) {
			case 'member':
				return {
					placement: 'start' as const,
					header: <div style={{ fontSize: 12, color: '#9c9a9a' }}>{(bubbleData as any).title}</div>,
					avatar: (bubbleData as any).avatarSrc
						? { src: (bubbleData as any).avatarSrc }
						: { icon: <UserOutlined />, style: { background: '#fde3cf' } },
					typing: { step: 5, interval: 20 },
					footer: <div style={{ fontSize: 10, color: '#cccccc' }}>{(bubbleData as any).time}</div>,

					messageRender: RenderIndex,
				}
			case 'user':
				return {
					placement: 'end' as const,
					header: <div style={{ fontSize: 12, color: '#9c9a9a' }}>{(bubbleData as any).title}</div>,
					avatar: (bubbleData as any).avatarSrc
						? { src: (bubbleData as any).avatarSrc }
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
			{myMembership === 'invite' ? (
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
								if (data.key === 'accept') await acceptInvite()
								if (data.key === 'decline') await declineInvite()
							}}
							styles={{ item: { cursor: isJoining || isLeaving ? 'not-allowed' : 'pointer' } }}
						/>
					</div>
				</div>
			) : Array.isArray(messages) && messages.length === 0 ? (
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
