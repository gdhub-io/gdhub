import { useEffect } from 'react'
import { createMatrixClient } from '@/lib/matrix-client'
import { useQuery } from '@tanstack/react-query'
import { Drawer, Grid, Layout } from 'antd'
import axios from 'axios'
import { ClientEvent, RoomEvent } from 'matrix-js-sdk'
import dynamic from 'next/dynamic'
import { useSession } from 'next-auth/react'
import styles from './ChatModal.module.scss'
import { useChat } from './useChat'

const ChatTitle = dynamic(() => import('./ChatTitle'), { ssr: false })
const ChatRooms = dynamic(() => import('./ChatRooms'), { ssr: false })
const ChatMessages = dynamic(() => import('./ChatMessages'), { ssr: false })
const ChatInput = dynamic(() => import('./ChatInput'), { ssr: false })

type ChatModalProps = { open: boolean; onClose: () => void; initialRoomId?: string | null }

export const ChatModal = ({ open = false, onClose, initialRoomId }: ChatModalProps) => {
	const screens = Grid.useBreakpoint()
	const { data: session } = useSession()
	const { chatClient, setChatClient, setReady } = useChat()

	const { data: clientSessionData } = useQuery({
		queryKey: ['chat-client-session', session?.user.id],
		queryFn: () => axios.post('/api/chat/session', undefined).then((res) => res.data),
		enabled: !!session?.user.id && open,
	})

	// start chat for client session
	useEffect(() => {
		if (!clientSessionData?.token) return

		createMatrixClient({ accessToken: clientSessionData.token, userId: clientSessionData.userId })
			.then((client) => {
				client.startClient()

				setChatClient(client)

				client.once(ClientEvent.Sync, function (state, prevState, res) {
					if (state === 'PREPARED') {
						console.log('prepared')
						setReady(true)
					} else {
						console.log('[chat] sync state', state)
					}
				})
			})
			.catch((error) => {
				console.error(error)
			})

		return () => {
			chatClient?.stopClient()
			setChatClient(null)
			setReady(false)
		}
	}, [clientSessionData?.token])

	return (
		<Drawer
			open={open}
			className={styles.chatDrawer}
			classNames={{ wrapper: styles.chatDrawerWrapper }}
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
	)
}
