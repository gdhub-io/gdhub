import { useEffect, useState } from 'react'
import { Typography } from 'antd'
import { useChat } from './useChat'

const { Text } = Typography

export default function ChatTitle() {
	const [title, setTitle] = useState('')
	const { selectedRoomId, chatClient, ready } = useChat()

	useEffect(() => {
		if (!selectedRoomId || !ready) return

		const room = chatClient?.getRoom(selectedRoomId)

		console.log('getAvatarUrl', room?.getAvatarUrl(chatClient?.baseUrl || '', 24, 24, 'crop'))

		setTitle(room?.name || '')
	}, [selectedRoomId, ready])

	return ready ? <Text>Chat with {title}</Text> : <Text>Chat</Text>
}
