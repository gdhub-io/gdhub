import { useState } from 'react'
import { LuArrowUp } from '@react-icons/all-files/lu/LuArrowUp'
import { Button, Drawer, Flex, Input } from 'antd'
import styles from './style.module.scss'

interface AIAgentDrawerProps {
	open: boolean
	onClose: () => void
}

type Message = {
	id: string
	text: string
}

export const AIAgentDrawer = ({ open, onClose }: AIAgentDrawerProps) => {
	const [messages, setMessages] = useState<Message[]>([])

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
			title="AI Assistant"
			styles={{ header: { display: 'none' } }}
			footer={
				<Flex gap={16} align="center" className={styles.agentDrawerInputWrapper}>
					<Input.TextArea autoSize={{ minRows: 1, maxRows: 3 }} variant="borderless" placeholder="Ask me anything..." />
					<Button type="primary" shape="circle" icon={<LuArrowUp />} className={styles.agentDrawerInputButton} />
				</Flex>
			}
		>
			<Flex vertical gap={16}>
				{messages.length > 0 ? (
					<div style={{ padding: '16px 24px', flex: 1 }}>
						{messages.map((message) => (
							<div key={message.id}>{message.text}</div>
						))}
					</div>
				) : (
					<div style={{ padding: '16px 24px', flex: 1 }}>No messages yet</div>
				)}
			</Flex>
		</Drawer>
	)
}
