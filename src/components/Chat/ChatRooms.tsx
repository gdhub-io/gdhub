import { useMemo } from 'react'
import { UserOutlined } from '@ant-design/icons'
import { type Conversation, Conversations } from '@ant-design/x'
import { useChat } from './ChatContext'

export default function ChatRooms() {
	const { selectedRoomId, setSelectedRoomId } = useChat()

	const items: Conversation[] = useMemo(
		() => [
			{
				key: 'room1',
				label: 'Room 1',
				value: 'room1',
				icon: <UserOutlined />,
			},
			{
				key: 'room2',
				label: 'Room 2',
				value: 'room2',
				icon: <UserOutlined />,
			},
			{
				key: 'room3',
				label: 'Room 3',
				value: 'room3',
				icon: <UserOutlined />,
			},
			{
				key: 'room4',
				label: 'Room 4',
				value: 'room4',
				icon: <UserOutlined />,
			},
		],
		[]
	)

	return <Conversations items={items} activeKey={selectedRoomId} onActiveChange={setSelectedRoomId} />
}
