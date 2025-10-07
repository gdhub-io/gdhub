import { useRef, useState } from 'react'
import { UserOutlined } from '@ant-design/icons'
import { Bubble, BubbleProps } from '@ant-design/x'
import { BubbleDataType } from '@ant-design/x/es/bubble/BubbleList'
import { Flex, GetRef } from 'antd'

export default function ChatMessages() {
	const listRef = useRef<GetRef<typeof Bubble.List>>(null)
	const [messages, setMessages] = useState<BubbleDataType[]>([
		{
			key: '1',
			role: 'member',
			content: 'Hello, how can I help you today?',
		},
		{
			key: '2',
			role: 'user',
			content: 'I have a question about the product',
		},
		{
			key: '3',
			role: 'member',
			content: 'I can help you with that. What is your question?',
		},
		{
			key: '4',
			role: 'user',
			content: 'I want to know more about the features of the product',
		},
	])

	const renderRoles = (bubbleData: BubbleDataType, index: number) => {
		const RenderIndex: BubbleProps['messageRender'] = (content) => <Flex>{content}</Flex>

		switch (bubbleData.role) {
			case 'member':
				return {
					placement: 'start' as const,
					avatar: { icon: <UserOutlined />, style: { background: '#fde3cf' } },
					typing: { step: 5, interval: 20 },
					// style: {
					// 	maxWidth: 600,
					// },
					messageRender: RenderIndex,
				}
			case 'user':
				return {
					placement: 'end' as const,
					avatar: { icon: <UserOutlined />, style: { background: '#87d068' } },
					messageRender: RenderIndex,
				}
			default:
				return { messageRender: RenderIndex }
		}
	}

	return (
		<Bubble.List ref={listRef} style={{ maxHeight: 300, paddingInline: 16 }} items={messages} roles={renderRoles} />
	)
}
