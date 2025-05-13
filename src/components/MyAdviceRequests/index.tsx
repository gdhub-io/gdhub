import React, { useMemo } from 'react'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Button, Flex, Typography, Spin, Space, Avatar, Empty } from 'antd'
import axios from 'axios'
import { useSession } from 'next-auth/react'
import qs from 'qs'
import styles from './styles.module.scss'
const { Title, Text } = Typography

const MyAdviceRequests: React.FC = () => {
	const { t } = useTolgee()
	const { data: session } = useSession()

	const { data, isLoading, error, refetch } = useQuery(['advice-requests'], () =>
		axios.get('/api/user/advice-requests', {
			params: {
				status: [
					prismaClient.AdviceRequestStatus.Created,
					prismaClient.AdviceRequestStatus.Approved,
					prismaClient.AdviceRequestStatus.Rejected,
				],
			},
			paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'repeat' }),
		})
	)

	const userId = session?.user?.id
	const incoming = useMemo(() => (data ? data.data.filter((r: any) => r.toUser.id === userId) : []), [data, userId])
	const outgoing = useMemo(() => (data ? data.data.filter((r: any) => r.fromUser.id === userId) : []), [data, userId])

	return (
		<div className={styles.adviceRequestsContainer}>
			<Flex justify="space-between" align="center" wrap>
				<Title level={2}>{t('page.hub.advice-requests', 'Advice Requests')}</Title>
				<Button type="primary">{t('page.hub.ask-question', 'Ask a question')}</Button>
			</Flex>
			<Space direction="vertical" size={32} style={{ width: '100%' }}>
				<div>
					<Title level={4}>{t('page.hub.incoming-requests', 'Incoming requests')}</Title>
					{isLoading ? (
						<Spin />
					) : incoming.length === 0 ? (
						<Empty description={t('No incoming requests')} />
					) : (
						<div className={styles.requestsList}>
							{incoming.map((req: any) => (
								<RequestCard key={req.id} req={req} type="incoming" />
							))}
						</div>
					)}
				</div>
				<div>
					<Title level={4}>{t('page.hub.outgoing-requests', 'Outgoing requests')}</Title>
					{isLoading ? (
						<Spin />
					) : outgoing.length === 0 ? (
						<Empty description={t('No outgoing requests')} />
					) : (
						<div className={styles.requestsList}>
							{outgoing.map((req: any) => (
								<RequestCard key={req.id} req={req} type="outgoing" />
							))}
						</div>
					)}
				</div>
			</Space>
		</div>
	)
}

const RequestCard: React.FC<{ req: any; type: 'incoming' | 'outgoing' }> = ({ req, type }) => {
	return (
		<div className={styles.requestCard}>
			<Flex align="center" gap={16}>
				<Avatar src={type === 'incoming' ? req.fromUser.image : req.toUser.image} />
				<div>
					<Text strong>
						{type === 'incoming' ? 'From ' + req.fromUser.profile?.name : 'To ' + req.toUser.profile?.name}
					</Text>
					<div>{req.topic}</div>
					<div style={{ color: '#888' }}>{req.comment}</div>
				</div>
				<div style={{ marginLeft: 'auto', color: '#888', display: 'flex', alignItems: 'center', gap: 8 }}>
					<span>{req.status}</span>
					{type === 'incoming' ? (
						<Button type="primary" size="small">
							Reply
						</Button>
					) : (
						<Button size="small">View</Button>
					)}
				</div>
			</Flex>
		</div>
	)
}

export default MyAdviceRequests
