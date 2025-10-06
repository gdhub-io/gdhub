import { useEffect, useState } from 'react'
import { ChatClient } from '@ably/chat'
import { ChatClientProvider, ChatRoomProvider } from '@ably/chat/react'
import { ThemeProvider, AvatarProvider, ChatSettingsProvider, ChatWindow } from '@ably/chat-react-ui-components'
import { useQuery } from '@tanstack/react-query'
import * as Ably from 'ably'
import { Drawer, Grid, Empty, Typography, Space, theme, List, Avatar, Flex } from 'antd'
import axios from 'axios'
import { useSession } from 'next-auth/react'
import styles from './ChatModal.module.scss'
import '@ably/chat-react-ui-components/dist/style.css'

type RoomMember = { userId: string; name: string | null; image: string | null }

type Room = { id: string; title?: string; members: string[]; membersInfo: RoomMember[] }

type ChatModalProps = { open: boolean; onClose: () => void; initialRoomId?: string | null }

export const ChatModal = ({ open, onClose, initialRoomId }: ChatModalProps) => {
	const { data: session } = useSession()
	const screens = Grid.useBreakpoint()
	const [chatClient, setChatClient] = useState<ChatClient | null>(null)
	const [realtime, setRealtime] = useState<Ably.Realtime | null>(null)
	const [ablyConnected, setAblyConnected] = useState(false)
	const [activeRoomId, setActiveRoomId] = useState<string | null>(initialRoomId || null)
	const { token } = theme.useToken()

	const { data: roomsData, isLoading } = useQuery({
		queryKey: ['chat-rooms'],
		queryFn: async () => {
			const res = await axios.get('/api/chat/rooms')
			return res.data as { rooms: Room[] }
		},
		enabled: open,
	})

	useEffect(() => {
		if (!session?.user?.id) return
		if (!roomsData || roomsData.rooms.length === 0) return
		const ablyClient = new Ably.Realtime({ clientId: session.user.id, authUrl: '/api/services/ably/token' })
		const c = new ChatClient(ablyClient)
		setChatClient(c)
		setRealtime(ablyClient)
		const onConnected = () => setAblyConnected(true)
		ablyClient.connection.once('connected', onConnected)
		return () => {
			try {
				ablyClient.connection.off('connected', onConnected)
				ablyClient.close()
			} catch {}
		}
	}, [session?.user?.id, roomsData?.rooms?.length])

	useEffect(() => {
		if (!activeRoomId && roomsData?.rooms?.length) {
			setActiveRoomId(roomsData.rooms[0].id)
		}
	}, [roomsData?.rooms, activeRoomId])

	// Enter/update presence with current user's profile for the active room
	useEffect(() => {
		if (!realtime || !ablyConnected || !activeRoomId) return
		const data = { name: session?.user?.name || null, image: session?.user?.image || null }
		const channelCandidates = [activeRoomId, `chat:${activeRoomId}`]
		let prevChannel: any = null

		const enterAll = async () => {
			for (const name of channelCandidates) {
				try {
					const ch = realtime.channels.get(name)
					await ch.presence.enterClient(realtime.auth.clientId as string, data)
					prevChannel = ch
					break
				} catch {
					continue
				}
			}
		}

		enterAll()

		return () => {
			if (prevChannel) {
				try {
					// leave current presence without specifying clientId
					void prevChannel.presence.leave()
				} catch {}
			}
		}
	}, [realtime, ablyConnected, activeRoomId, session?.user?.name, session?.user?.image])

	// Sync current user display name/avatar into Ably Chat presence (component-friendly)
	useEffect(() => {
		if (!chatClient || !activeRoomId || !session?.user) return
		let mounted = true
		const run = async () => {
			try {
				const room = await (chatClient as any).rooms.get(activeRoomId)
				await room.presence.enter({ displayName: session.user.name, avatarUrl: session.user.image })
				if (!mounted) return
				await room.presence.update({ displayName: session.user.name, avatarUrl: session.user.image })
			} catch {}
		}
		run()
		return () => {
			mounted = false
		}
	}, [chatClient, activeRoomId, session?.user?.name, session?.user?.image])

	const hasRooms = (roomsData?.rooms?.length || 0) > 0

	const getRoomDisplay = (room: Room) => {
		if (room.title) return room.title
		const other = room.membersInfo.find((m) => m.userId !== session?.user?.id)
		return other?.name || other?.userId || room.id
	}

	return (
		<Drawer
			open={open}
			onClose={onClose}
			title="Chat"
			width={screens.lg ? 720 : '100%'}
			destroyOnClose
			styles={{
				body: { padding: 0, display: 'flex', flexDirection: 'column' },
				content: { boxShadow: 'none', border: 'none' },
				header: { borderBottom: 'none' },
			}}
		>
			<style jsx global>{`
				/* Hide potential room creation and theme toggle controls if present */
				.ac-theme-toggle,
				.ably-theme-toggle {
					display: none !important;
				}

				/* Strip paddings, borders, shadows inside Ably UI */
				.${styles.container} * {
					box-shadow: none !important;
				}
				.${styles.container} .ac-header,
				.${styles.container} .ac-footer {
					padding: 0 !important;
					border: none !important;
				}
			`}</style>
			{!isLoading && !hasRooms ? (
				<Empty
					description={
						<Space direction="vertical" size={4}>
							<Typography.Text type="secondary">No chats yet</Typography.Text>
							<Typography.Text type="secondary">Start a conversation from mentors or project pages.</Typography.Text>
						</Space>
					}
				/>
			) : chatClient && hasRooms ? (
				<div className={styles.container} style={{ fontFamily: token.fontFamily, display: 'flex', height: '100%' }}>
					<ThemeProvider>
						<AvatarProvider>
							<ChatSettingsProvider>
								<ChatClientProvider client={chatClient}>
									<Flex style={{ width: '100%', height: '100%' }}>
										<div
											style={{ width: 260, borderRight: `1px solid ${token.colorBorderSecondary}`, overflow: 'auto' }}
										>
											<List
												dataSource={roomsData?.rooms || []}
												renderItem={(room) => {
													const other = room.membersInfo.find((m) => m.userId !== session?.user?.id)
													return (
														<List.Item
															onClick={() => setActiveRoomId(room.id)}
															style={{
																cursor: 'pointer',
																background: activeRoomId === room.id ? token.colorFillSecondary : undefined,
															}}
														>
															<List.Item.Meta
																avatar={
																	<Avatar src={other?.image || undefined}>{(other?.name || 'C')?.charAt(0)}</Avatar>
																}
																title={<Typography.Text strong>{getRoomDisplay(room)}</Typography.Text>}
															/>
														</List.Item>
													)
												}}
											/>
										</div>
										<div style={{ flex: 1, minWidth: 0, height: '100%' }}>
											{activeRoomId && (
												<ChatRoomProvider name={activeRoomId}>
													<ChatWindow roomName={activeRoomId} />
												</ChatRoomProvider>
											)}
										</div>
									</Flex>
								</ChatClientProvider>
							</ChatSettingsProvider>
						</AvatarProvider>
					</ThemeProvider>
				</div>
			) : null}
		</Drawer>
	)
}
