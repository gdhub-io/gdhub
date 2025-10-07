import { Typography } from 'antd'
import { useChat } from './ChatContext'

const { Text } = Typography

export default function ChatTitle() {
	const { selectedRoomId } = useChat()

	return <Text>Chat with {selectedRoomId}</Text>
}
