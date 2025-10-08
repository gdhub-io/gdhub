import { useEffect, useMemo, useState } from 'react'
import { UserOutlined } from '@ant-design/icons'
import { type Conversation, Conversations } from '@ant-design/x'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from 'antd'
import axios from 'axios'
import { useChat } from './useChat'

type SerializableRoom = {
	roomId: string
	name: string
	topic: string
	canonicalAlias: string | null
	aliases: string[]
	memberCount: number
	myMembership: string
	lastActiveTimestamp: number
	lastMessage: {
		eventId: string
		content: any
		ts: number
		sender: string
	} | null
}

export default function ChatRooms() {
	const { selectedRoomId, setSelectedRoomId, chatClient, ready } = useChat()
	const [items, setItems] = useState<Conversation[]>([])

	useEffect(() => {
		if (!chatClient || !ready) return

		const rooms = chatClient.getRooms() || []

		console.log('[chat] rooms', rooms)

		setItems(
			rooms.map((r) => ({
				key: r.roomId,
				label: r.name,
				value: r.roomId,
				icon: <UserOutlined />,
			}))
		)
	}, [chatClient, ready])

	// const { data: rooms, isLoading: isLoadingRooms } = useQuery({
	// 	queryKey: ['chat-rooms', chatSession?.userId],
	// 	queryFn: async () => axios.get<SerializableRoom[]>('/api/chat/rooms').then((res) => res.data),
	// 	// staleTime: 30_000,
	// 	enabled: ready,
	// })

	// const items: Conversation[] = useMemo(() => {
	// 	return (rooms || []).map((r) => ({
	// 		key: r.roomId,
	// 		label: r.name,
	// 		value: r.roomId,
	// 		icon: <UserOutlined />,
	// 	}))
	// }, [rooms])

	// useEffect(() => {
	// 	if (!selectedRoomId && items.length) setSelectedRoomId(items[0].key)
	// }, [items, selectedRoomId, setSelectedRoomId])

	// if (isLoadingRooms) {
	// 	return <Skeleton active paragraph={{ rows: 6 }} />
	// }

	return <Conversations items={items} activeKey={selectedRoomId || undefined} onActiveChange={setSelectedRoomId} />
}
