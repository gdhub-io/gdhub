import { useEffect, useState } from 'react'
import { type Conversation, Conversations, ConversationsProps } from '@ant-design/x'
import { IconDoorExit } from '@tabler/icons-react'
import { Avatar, Badge, Flex, message, Skeleton } from 'antd'
import { Room, RoomEvent } from 'matrix-js-sdk'
import styles from './ChatModal.module.scss'
import { useChat } from './useChat'

export default function ChatRooms({ onReady }: { onReady: (data: { count: number }) => void }) {
	const { selectedRoomId, setSelectedRoomId, chatClient, ready } = useChat()
	const [items, setItems] = useState<Conversation[]>([])

	useEffect(() => {
		if (!chatClient || !ready) {
			return
		}

		console.log(
			'[chat] rooms',
			chatClient.getRooms().map((r) => ({ myMembership: r.getMyMembership(), ...r }))
		)

		const mapRoomsToItems = (rooms: Room[]): Conversation[] =>
			rooms
				.filter((r) => ['join', 'invite'].includes(r.getMyMembership()))
				.map((r) => {
					const fallbackMember = r.getAvatarFallbackMember()
					const userActive = fallbackMember?.user?.currentlyActive

					return {
						key: r.roomId,
						label: r.name,
						value: r.roomId,
						icon: (
							<Badge dot={true} color={userActive ? 'green' : 'red'} offset={[0, 28]}>
								<Avatar
									shape="square"
									src={fallbackMember?.getAvatarUrl(chatClient.baseUrl, 24, 24, 'crop', true, true)}
								/>
							</Badge>
						),
					}
				})

		setItems(mapRoomsToItems(chatClient.getRooms() || []))

		const onMembership = () => setItems(mapRoomsToItems(chatClient.getRooms() || []))
		const onTimelineReset = () => setItems(mapRoomsToItems(chatClient.getRooms() || []))

		chatClient.on(RoomEvent.MyMembership, onMembership)
		chatClient.on(RoomEvent.TimelineReset as any, onTimelineReset)

		onReady({ count: mapRoomsToItems(chatClient.getRooms() || []).length })

		return () => {
			chatClient.removeListener(RoomEvent.MyMembership, onMembership)
			chatClient.removeListener(RoomEvent.TimelineReset as any, onTimelineReset)
		}
	}, [chatClient, ready])

	useEffect(() => {
		if (!selectedRoomId && items.length) setSelectedRoomId(items[0].key)
	}, [items, selectedRoomId, setSelectedRoomId])

	const menuConfig: ConversationsProps['menu'] = (conversation) => {
		const member = chatClient?.getRoom(conversation.value)?.getMember(chatClient?.getUserId() || '')

		// if user is not a member of the room, return undefined
		if (member?.membership !== 'join') return undefined

		return {
			items: [{ label: 'Leave', key: 'leave', icon: <IconDoorExit />, danger: true }],
			onClick: async (menuInfo) => {
				menuInfo.domEvent.stopPropagation()

				if (menuInfo.key === 'leave') {
					await chatClient?.leave(conversation.value)
					message.info(`You left ${conversation.label} room`)

					setItems((prev) => prev.filter((i) => i.value !== conversation.value))
				}
			},
		}
	}

	if (items.length === 0) {
		return (
			<Flex vertical gap={8} style={{ width: '100%', padding: '16px' }}>
				<Skeleton.Button active={!ready} className={styles.chatRoomsSkeleton} />
				<Skeleton.Button active={!ready} className={styles.chatRoomsSkeleton} />
				<Skeleton.Button active={!ready} className={styles.chatRoomsSkeleton} />
				<Skeleton.Button active={!ready} className={styles.chatRoomsSkeleton} />
			</Flex>
		)
	}

	return (
		<Conversations
			items={items}
			menu={menuConfig}
			activeKey={selectedRoomId || undefined}
			onActiveChange={setSelectedRoomId}
		/>
	)
}
