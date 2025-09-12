import React from 'react'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { FaBan } from '@react-icons/all-files/fa/FaBan'
import { MdCancel } from '@react-icons/all-files/md/MdCancel'
import { MdCheckCircle } from '@react-icons/all-files/md/MdCheckCircle'
import { MdFiberManualRecord } from '@react-icons/all-files/md/MdFiberManualRecord'
import { useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Modal, theme, Tooltip } from 'antd'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'
import { useSession } from 'next-auth/react'
import ModernTable from '../ModernTable'

interface ProjectAdviceArchiveModalProps {
	open: boolean
	projectId: string
	advisor: prismaClient.User & { profile: prismaClient.Profile }
	onClose: () => void
}

const ProjectAdviceArchiveModal: React.FC<ProjectAdviceArchiveModalProps> = ({ open, projectId, advisor, onClose }) => {
	const { t } = useTolgee()
	const { data: session } = useSession()
	const { token: themeToken } = theme.useToken()

	const {
		data: advisorAdviceRequests,
		isLoading: isLoadingAdvisorAdviceRequests,
		refetch: fetchProjectAdviceRequests,
	} = useQuery({
		queryKey: ['project-advice-requests', projectId, advisor?.id],
		queryFn: () =>
			axios.get<prismaClient.AdviceRequest[]>('/api/user/advice-requests', {
				params: { projectId, advisorId: advisor?.id },
			}),
		enabled: !!projectId && !!advisor?.id,
	})

	React.useEffect(() => {
		if (open && projectId) {
			fetchProjectAdviceRequests()
		}
	}, [open, projectId])

	const adviceArchiveColumns: ColumnsType<prismaClient.AdviceRequest> = [
		{
			title: t('Status'),
			dataIndex: 'status',
			key: 'status',
			align: 'center',
			render: (status: string) => {
				let icon = null
				let text = ''
				switch (status) {
					case 'Approved':
						icon = <MdCheckCircle style={{ color: '#52c41a', fontSize: 22 }} />
						text = t('Approved')
						break
					case 'Rejected':
						icon = <MdCancel style={{ color: '#ff4d4f', fontSize: 22 }} />
						text = t('Rejected')
						break
					case 'Closed':
						icon = <FaBan style={{ color: themeToken.colorTextSecondary, fontSize: 16 }} />
						text = t('Closed')
						break
					case 'Created':
					default:
						icon = <MdFiberManualRecord style={{ color: '#1890ff', fontSize: 8 }} />
						text = t('Created')
						break
				}
				return <Tooltip title={text}>{icon}</Tooltip>
			},
		},
		{
			title: t('From'),
			dataIndex: 'fromUser',
			key: 'fromUser',
			render: (fromUser: prismaClient.User & { profile: prismaClient.Profile }) => {
				if (!fromUser) return '-'
				if (fromUser.id === session?.user?.id) {
					return t('You')
				}
				return fromUser.profile?.name || '-'
			},
		},
		{
			title: t('Topic'),
			dataIndex: 'topic',
			key: 'topic',
		},
		{
			title: t('Comment/Feedback'),
			key: 'commentFeedback',
			render: (_: any, record: prismaClient.AdviceRequest) => (
				<>
					<span style={{ color: themeToken.colorTextSecondary }}>{t('Comment')}:</span> {record.comment || '-'}
					<br />
					<span style={{ color: themeToken.colorTextSecondary }}>{t('Feedback')}:</span> {record.feedback || '-'}
				</>
			),
		},
		{
			title: t('Created At'),
			dataIndex: 'createdAt',
			key: 'createdAt',
			render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
		},
		{
			title: t('Finished At'),
			dataIndex: 'finishedAt',
			key: 'finishedAt',
			render: (date: string) => (date ? dayjs(date).format('DD.MM.YYYY HH:mm') : '-'),
		},
	]

	return (
		<>
			<Modal
				open={open}
				onCancel={onClose}
				onOk={onClose}
				title={t('Advice requests archive to ') + (advisor?.id ? `${advisor.profile.name}` : 'Advisors')}
				width={'80%'}
				footer={null}
			>
				<ModernTable
					loading={isLoadingAdvisorAdviceRequests}
					columns={adviceArchiveColumns}
					dataSource={advisorAdviceRequests?.data?.map((r: any) => ({ ...r, key: r.id })) || []}
					pagination={false}
					size="small"
				/>
			</Modal>
		</>
	)
}

export default ProjectAdviceArchiveModal
