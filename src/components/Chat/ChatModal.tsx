import { Drawer, Grid, Layout } from 'antd'
import '@ably/chat-react-ui-components/dist/style.css'
import dynamic from 'next/dynamic'
import { ChatProvider } from './ChatContext'
import styles from './ChatModal.module.scss'

const ChatTitle = dynamic(() => import('./ChatTitle'), { ssr: false })
const ChatRooms = dynamic(() => import('./ChatRooms'), { ssr: false })
const ChatMessages = dynamic(() => import('./ChatMessages'), { ssr: false })
const ChatInput = dynamic(() => import('./ChatInput'), { ssr: false })

type ChatModalProps = { open: boolean; onClose: () => void; initialRoomId?: string | null }

export const ChatModal = ({ open = true, onClose, initialRoomId }: ChatModalProps) => {
	const screens = Grid.useBreakpoint()

	return (
		<ChatProvider>
			<Drawer
				open={open}
				className={styles.chatDrawer}
				onClose={onClose}
				title={<ChatTitle />}
				width={screens.lg ? 720 : '100%'}
				styles={{
					body: { padding: 0, display: 'flex', flexDirection: 'column' },
				}}
			>
				<Layout>
					<Layout.Sider theme="light" className={styles.chatRoomsSider}>
						<ChatRooms />
					</Layout.Sider>
					<Layout.Content>
						<div className={styles.chatContent}>
							<ChatMessages />
							<ChatInput />
						</div>
					</Layout.Content>
				</Layout>
			</Drawer>
		</ChatProvider>
	)
}
