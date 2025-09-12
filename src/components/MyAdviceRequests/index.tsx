import React, { useMemo } from 'react'
import UserAdviceArchiveModal from '@/components/modals/UserAdviceArchiveModal'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { AiOutlineHistory } from '@react-icons/all-files/ai/AiOutlineHistory'
import { FaBan } from '@react-icons/all-files/fa/FaBan'
import { MdCancel } from '@react-icons/all-files/md/MdCancel'
import { MdCheckCircle } from '@react-icons/all-files/md/MdCheckCircle'
import { MdFiberManualRecord } from '@react-icons/all-files/md/MdFiberManualRecord'
import { MdOutlineSupportAgent } from '@react-icons/all-files/md/MdOutlineSupportAgent'
import { useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Button, Flex, Typography, Spin, Space, Avatar } from 'antd'
import axios from 'axios'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import qs from 'qs'
import styles from './styles.module.scss'

const { Title, Text } = Typography

type RequestCardData = prismaClient.AdviceRequest & {
	fromUser?: prismaClient.User & { profile: prismaClient.Profile }
	toUser: prismaClient.User & { profile: prismaClient.Profile }
	fromTelegramUser?: { name: string; image: string }
}

const MyAdviceRequests: React.FC = () => {
	const { t } = useTolgee()
	const { data: session } = useSession()
	const [showArchive, setShowArchive] = React.useState(false)

	const { data, isLoading, isFetched } = useQuery({
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

	if (!isFetched || (!isLoading && incoming.length === 0 && outgoing.length === 0)) {
		return null
	}

	return (
		<>
			<div className={styles.adviceRequestsContainer}>
				<Flex justify="space-between" align="center" wrap>
					<Space>
						<MdOutlineSupportAgent size={36} />
						<Title level={2}>{t('page.hub.advice-requests', 'Advice Requests')}</Title>
					</Space>
					<Space>
						<Button
							type="text"
							icon={<AiOutlineHistory />}
							onClick={() => setShowArchive(true)}
							aria-label="Archive"
							title={t('Archive')}
						/>
						<Link href="/hub/mentors">
							<Button type="primary">{t('page.hub.ask-question', 'Ask a question')}</Button>
						</Link>
					</Space>
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
										<RequestCard key={req.id} req={req} type="incoming" />
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
										<RequestCard key={req.id} req={req} type="outgoing" />
									))}
								</div>
							)}
						</div>
					)}
				</Space>
			</div>

			<UserAdviceArchiveModal open={showArchive} user={session?.user} onClose={() => setShowArchive(false)} />
		</>
	)
}

const getStatusIcon = (status: string) => {
	switch (status) {
		case 'Approved':
			return <MdCheckCircle style={{ color: '#52c41a', fontSize: 16, background: '#fff', borderRadius: '50%' }} />
		case 'Rejected':
			return <MdCancel style={{ color: '#ff4d4f', fontSize: 16, background: '#fff', borderRadius: '50%' }} />
		case 'Closed':
			return <FaBan style={{ color: '#888', fontSize: 16, background: '#fff', borderRadius: '50%' }} />
		case 'Created':
		default:
			return <MdFiberManualRecord style={{ color: '#1890ff', fontSize: 12, background: '#fff', borderRadius: '50%' }} />
	}
}

const RequestCard: React.FC<{
	req: RequestCardData
	type: 'incoming' | 'outgoing'
}> = ({ req, type }) => {
	const { t } = useTolgee()

	const isTelegramUser = useMemo(() => Boolean(req.fromUser) === false, [req])
	const fromUserName = useMemo(() => (req.fromUser ? req.fromUser.profile.name : req.fromTelegramUser?.name), [req])
	const toUserName = useMemo(() => (req.toUser ? req.toUser.profile.name : t('Unknown')), [req])

	return (
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
							<Link href={`https://t.me/gdhub_experts_bot/app?startapp=areq_${req.id}`} target="_blank">
								<Button type="primary" size="small">
									Reply
								</Button>
							</Link>
						) : (
							<Link href={`https://t.me/gdhub_experts_bot/app?startapp=areq_${req.id}`} target="_blank">
								<Button size="small">View</Button>
							</Link>
						)
					) : (
						<Link href={`https://t.me/gdhub_experts_bot/app?startapp=areq_${req.id}`} target="_blank">
							<Button size="small">View</Button>
						</Link>
					)}
				</div>
			</Flex>
		</div>
	)
}

export default MyAdviceRequests
