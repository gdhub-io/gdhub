import React, { useMemo, useState } from 'react'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { MdOutlineSupportAgent } from '@react-icons/all-files/md/MdOutlineSupportAgent'
import { IconBan, IconCancel, IconCheck, IconClock } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslate } from '@tolgee/react'
import { Button, Flex, Typography, Spin, Space, Avatar } from 'antd'
import axios from 'axios'
import { useSession } from 'next-auth/react'
import qs from 'qs'
import styles from './styles.module.scss'
import { useChat } from '../Chat/useChat'
import ExpertRequestModal from '../modals/ExpertRequestModal'

const { Title, Text } = Typography

type RequestCardData = prismaClient.AdviceRequest & {
	fromUser?: prismaClient.User & { profile: prismaClient.Profile }
	toUser: prismaClient.User & { profile: prismaClient.Profile }
	fromTelegramUser?: { name: string; image: string }
}

const MyAdviceRequests: React.FC<{ showTitle?: boolean }> = ({ showTitle = true }) => {
	const { t } = useTranslate()
	const { data: session } = useSession()
	const [selectedAdviceRequestId, setSelectedAdviceRequestId] = useState<string | undefined>(undefined)
	const { setSelectedRoomByAlias, setOpenChatModal } = useChat()

	const { data, isLoading, isFetched, refetch } = useQuery({
		queryKey: ['advice-requests'],
		queryFn: () =>
			axios.get('/api/user/advice-requests', {
				params: {
					status: [prismaClient.AdviceRequestStatus.Created],
				},
				paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'repeat' }),
			}),
	})

	const userId = session?.user?.id
	const incoming = useMemo(() => (data ? data.data.filter((r: any) => r.toUser?.id === userId) : []), [data, userId])
	const outgoing = useMemo(() => (data ? data.data.filter((r: any) => r.fromUser?.id === userId) : []), [data, userId])

	const handleRequestsChange = () => {
		refetch()
		setSelectedAdviceRequestId(undefined)
	}

	const handleOpenRequestChat = async (adviceRequestId: string) => {
		await setSelectedRoomByAlias(`advreq-${adviceRequestId}`)
		setOpenChatModal(true)
		setSelectedAdviceRequestId(undefined)
	}

	if (!isFetched || (!isLoading && incoming.length === 0 && outgoing.length === 0)) {
		return null
	}

	return (
		<div className={styles.adviceRequestsContainer}>
			<Flex justify="space-between" align="center" wrap>
				{showTitle && (
					<Space>
						<MdOutlineSupportAgent size={36} />
						<Title level={2}>{t('page.hub.advice-requests', 'Advice Requests')}</Title>
					</Space>
				)}
			</Flex>
			<Space direction="vertical" size={32} style={{ width: '100%' }}>
				{incoming.length > 0 && (
					<div>
						<Title level={4}>{t('page.hub.incoming-requests', 'Incoming')}</Title>
						{isLoading ? (
							<Spin />
						) : (
							<div className={styles.requestsList}>
								{incoming.map((req: any) => (
									<RequestCard
										key={req.id}
										req={req}
										type="incoming"
										onReply={handleOpenRequestChat}
										onView={setSelectedAdviceRequestId}
									/>
								))}
							</div>
						)}
					</div>
				)}
				{outgoing.length > 0 && (
					<div>
						<Title level={4}>{t('page.hub.outgoing-requests', 'Outgoing')}</Title>
						{isLoading ? (
							<Spin />
						) : (
							<div className={styles.requestsList}>
								{outgoing.map((req: any) => (
									<RequestCard
										key={req.id}
										req={req}
										type="outgoing"
										onView={setSelectedAdviceRequestId}
										onReply={handleOpenRequestChat}
									/>
								))}
							</div>
						)}
					</div>
				)}
			</Space>

			<ExpertRequestModal
				adviceRequestId={selectedAdviceRequestId}
				open={!!selectedAdviceRequestId}
				onCancel={() => setSelectedAdviceRequestId(undefined)}
				onUpdate={() => handleRequestsChange()}
			/>
		</div>
	)
}

const getStatusIcon = (status: string) => {
	switch (status) {
		case 'Approved':
			return <IconCheck size={18} style={{ color: '#52c41a', background: '#fff', borderRadius: '50%' }} />
		case 'Rejected':
			return <IconCancel size={18} style={{ color: '#ff4d4f', background: '#fff', borderRadius: '50%' }} />
		case 'Closed':
			return <IconBan size={18} style={{ color: '#888', background: '#fff', borderRadius: '50%' }} />
		case 'Created':
		default:
			return <IconClock size={18} style={{ color: '#1890ff', background: '#fff', borderRadius: '50%' }} />
	}
}

const RequestCard: React.FC<{
	req: RequestCardData
	type: 'incoming' | 'outgoing'
	onView: (adviceRequestId: string) => void
	onReply: (adviceRequestId: string) => void
}> = ({ req, type, onView, onReply }) => {
	const { t } = useTranslate()
	const isTelegramUser = useMemo(() => Boolean(req.fromUser) === false, [req])
	const fromUserName = useMemo(() => (req.fromUser ? req.fromUser.profile.name : req.fromTelegramUser?.name), [req])
	const toUserName = useMemo(() => (req.toUser ? req.toUser.profile.name : t('Unknown')), [req])

	return (
		<>
			<div className={styles.requestCard}>
				<Flex align="center" gap={16}>
					<div style={{ position: 'relative', display: 'inline-block' }}>
						<Avatar src={type === 'incoming' ? req.fromUser?.image : req.toUser?.image} />
						<span
							style={{
								position: 'absolute',
								bottom: -8,
								right: -2,
								background: 'transparent',
								borderRadius: '50%',
								zIndex: 2,
							}}
						>
							{getStatusIcon(req.status)}
						</span>
					</div>
					<div>
						<Space>
							<Text strong>{type === 'incoming' ? 'From ' + fromUserName : 'To ' + toUserName}</Text>
							{isTelegramUser && <Text type="secondary">({t('Telegram user')})</Text>}
						</Space>
						<div>{req.topic}</div>
						<div style={{ color: '#888' }}>{req.comment}</div>
					</div>
					<div style={{ marginLeft: 'auto', color: '#888', display: 'flex', alignItems: 'center', gap: 8 }}>
						{type === 'incoming' ? (
							req.status === 'Created' ? (
								<>
									<Button type="primary" size="small" onClick={() => onReply(req.id)}>
										Accept
									</Button>
									<Button type="default" size="small" onClick={() => onReply(req.id)}>
										Reject
									</Button>
									<Button type="default" size="small" onClick={() => onReply(req.id)}>
										Chat
									</Button>
								</>
							) : (
								<Button size="small" onClick={() => onView(req.id)}>
									View
								</Button>
							)
						) : (
							<Button size="small" onClick={() => onView(req.id)}>
								View
							</Button>
						)}
					</div>
				</Flex>
			</div>
		</>
	)
}

export default MyAdviceRequests
