import { useCallback, useContext, useState } from 'react'
import EquityShareModal from '@/components/modals/EquityShareModal'
import InviteMemberModal from '@/components/modals/InviteMemberModal'
import MemberEquityPromiseModal from '@/components/modals/MemberEquityPromiseModal'
import ModernTable from '@/components/ModernTable'
import tableStyles from '@/components/ModernTable/ModernTable.module.scss'
import TeamMemberCard from '@/components/TeamMemberCard'
import { ProjectContext } from '@/contexts/ProjectContext'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { BiTrash } from '@react-icons/all-files/bi/BiTrash'
import { MdOutlineHandshake } from '@react-icons/all-files/md/MdOutlineHandshake'
import { TbDotsVertical } from '@react-icons/all-files/tb/TbDotsVertical'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Grid, message, Flex, Typography, Tag, Space, Dropdown, Modal, Avatar } from 'antd'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'
import EquitySection from './EquitySection'

const { Text } = Typography

const MyTeam = () => {
	const screens = Grid.useBreakpoint()
	const { t } = useTolgee()
	const [modal, contextHolder] = Modal.useModal()
	const contextProject = useContext(ProjectContext)?.contextProject
	const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
	const [isEquityModalOpen, setIsEquityModalOpen] = useState(false)
	const [isMemberEquityPromiseModalOpen, setIsMemberEquityPromiseModalOpen] = useState(false)
	const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
	const [showMemberCard, setShowMemberCard] = useState(false)

	const {
		data: team,
		refetch: fetchMyTeam,
		isLoading: isLoadingMyTeam,
	} = useQuery(
		['user-project-team', contextProject?.teamId],
		() =>
			axios.get<prismaClient.Team & { members: (prismaClient.TeamMember & { user: prismaClient.User })[] }>(
				'/api/user/project/team',
				{
					params: { teamId: contextProject?.teamId },
				}
			),
		{
			enabled: !!contextProject?.teamId,
		}
	)

	const {
		data: pendingInvitations,
		refetch: fetchPendingInvitations,
		isLoading: isLoadingPendingInvitations,
	} = useQuery(
		['team-pending-invitations', contextProject?.teamId],
		() =>
			axios.get<prismaClient.TeamInvitation[]>('/api/user/project/team/pending-invitations', {
				params: { teamId: contextProject?.teamId },
			}),
		{
			enabled: !!contextProject?.teamId && !!contextProject?.isProjectAuthor,
		}
	)

	const {
		data: projectEquity,
		refetch: fetchProjectEquity,
		isLoading: isLoadingEquity,
	} = useQuery(
		['project-equity', contextProject?.id],
		() =>
			axios.get('/api/user/project/equity', {
				params: { projectId: contextProject?.id },
			}),
		{
			enabled: !!contextProject?.id,
		}
	)

	const { mutateAsync: fireMember, isLoading: isFiring } = useMutation(
		(data: { id: string }) => axios.put<void>('/api/user/project/vacancy/candidate/fire', data),
		{
			onSuccess: () => {
				fetchMyTeam()
			},
		}
	)

	const { mutateAsync: cancelInvitation, isLoading: isCanceling } = useMutation(
		(data: { id: string }) => axios.delete<void>('/api/user/project/team/invitation', { params: data }),
		{
			onSuccess: () => {
				fetchPendingInvitations()
			},
		}
	)

	const handleFired = useCallback(
		async (teamMemberId: string) => {
			modal.confirm({
				title: t('Are you sure you want to fire this member?'),
				destroyOnClose: true,
				type: 'confirm',
				okText: 'Yes',
				okType: 'primary',
				cancelText: 'No',
				icon: <ExclamationCircleOutlined />,
				content: t('This action will dismisse the member from the team and delete all their equity promises.'),
				async onOk() {
					try {
						await fireMember({ id: teamMemberId })
						fetchMyTeam()

						message.success(t('The employee is dismissed'))
					} catch (error: any) {
						console.log(error)

						message.error(error.message)
					}
				},
				onCancel() {},
			})
		},
		[t, fireMember, fetchMyTeam]
	)

	const handleCancelInvitation = async (invitationId: string) => {
		try {
			await cancelInvitation({ id: invitationId })
			message.success(t('Invitation canceled'))
		} catch (error: any) {
			console.log(error)
			message.error(error.message)
		}
	}

	const handleOpenInviteModal = () => {
		setIsInviteModalOpen(true)
	}

	const handleCloseInviteModal = () => {
		setIsInviteModalOpen(false)
	}

	const handleInviteSuccess = () => {
		setIsInviteModalOpen(false)
		fetchMyTeam()
		fetchPendingInvitations()
	}

	const handleOpenEquityModal = () => {
		setIsEquityModalOpen(true)
	}

	const handleCloseEquityModal = () => {
		setIsEquityModalOpen(false)
	}

	const handleEquityUpdateSuccess = () => {
		setIsEquityModalOpen(false)
		fetchProjectEquity()
	}

	const getMemberShare = (memberId: string) => {
		if (!projectEquity?.data?.equityAllocations) return null
		return projectEquity.data.equityAllocations.find((share: any) => share.teamMemberId === memberId)
	}

	const getMemberPromisePercentage = (memberId: string) => {
		if (!projectEquity?.data?.equityAllocations) return null

		const memberPromises = projectEquity.data.equityAllocations
			.filter((allocation: any) => allocation.teamMemberId === memberId)
			.flatMap((allocation: any) => allocation.promises)

		console.log(memberId, memberPromises)

		return memberPromises.reduce((acc: number, promise: any) => acc + promise.percentage, 0)
	}

	const handleOpenMemberEquityPromiseModal = (member: prismaClient.TeamMember & { user: prismaClient.User }) => {
		setSelectedMemberId(member.id)
		setIsMemberEquityPromiseModalOpen(true)
	}

	const handleCloseMemberEquityPromiseModal = () => {
		setIsMemberEquityPromiseModalOpen(false)
		setSelectedMemberId(null)
	}

	const handleDeleteMemberEquityPromise = () => {
		handleCloseMemberEquityPromiseModal()
		fetchProjectEquity()
	}

	const handleMemberEquityPromiseUpdateSuccess = (percentage: number, vested: boolean, targetStepId?: string) => {
		handleCloseMemberEquityPromiseModal()
		fetchProjectEquity()
	}

	const getMaxAvailableShare = (currentPromiseShare: number) => {
		if (!projectEquity?.data) return 0

		const teamTotal = projectEquity.data.equityAllocations?.reduce(
			(sum: number, share: any) =>
				sum + share.percentage + share.promises.reduce((acc: number, promise: any) => acc + promise.percentage, 0),
			0
		)
		const allocated =
			projectEquity.data.platformShare +
			projectEquity.data.mentorFundShare +
			projectEquity.data.investmentReserve +
			teamTotal

		const remainingPercentage = 100 - allocated + currentPromiseShare

		return Math.min(remainingPercentage, 97)
	}

	const handleShowMemberCard = (memberId: string) => {
		setSelectedMemberId(memberId)
		setShowMemberCard(true)
	}

	const handleCloseMemberCard = () => {
		setShowMemberCard(false)
		setSelectedMemberId(null)
	}

	const columns: ColumnsType<prismaClient.TeamMember & { user: prismaClient.User }> = [
		{
			title: t('Team Member'),
			dataIndex: 'id',
			key: 'id',
			render: (value, record) => (
				<>
					<div style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => handleShowMemberCard(record.id)}>
						<Space>
							<Avatar shape="square" size={32} src={record.user.image || null} />
							{record.user.name}
						</Space>
					</div>
					<small>{record.position || t('No position specified')}</small>
				</>
			),
		},
		{
			title: t('Position'),
			dataIndex: 'position',
			key: 'position',
			responsive: ['md'],
			render: (value, member) => {
				return member.status === prismaClient.TeamMemberStatus.Founder ? (
					<Space>
						<Text>{value}</Text>
						<Tag color="gold">founder</Tag>
					</Space>
				) : (
					value
				)
			},
		},
		{
			title: t('Start and End Dates'),
			dataIndex: 'startedAt',
			responsive: ['md'],
			key: 'startedAt',
			render(value, member) {
				let startedAt = dayjs(member.startedAt).format('DD.MM.YYYY')
				let finishedAt = member.finishedAt ? dayjs(member.finishedAt).format('DD.MM.YYYY') : t('present')
				return (
					<Text className={tableStyles.tableMemberDates}>
						<T
							keyName="fromToWithDates"
							defaultValue="from {fromDate} to {toDate}"
							params={{ fromDate: startedAt, toDate: finishedAt }}
						/>
					</Text>
				)
			},
		},
		{
			title: t('Time for work'),
			dataIndex: ['user', 'profile', 'timeForWork'],
			key: 'timeForWork',
			responsive: ['md'],
			render: (value) => {
				if (!value) return null

				if (value[0] === value[1]) {
					return (
						<Text>
							{value[0]} {t('hours/week')}
						</Text>
					)
				}

				return (
					<Text>
						{value[0]} - {value[1]} {t('hours/week')}
					</Text>
				)
			},
		},
		{
			title: t('Promises'),
			key: 'promises',
			align: 'center',
			render: (_, member) => {
				if (
					member.status === prismaClient.TeamMemberStatus.Fired ||
					member.status === prismaClient.TeamMemberStatus.Rejected
				) {
					return <Text type="secondary">-</Text>
				}

				const memberShare = getMemberShare(member.id)

				if (!memberShare?.promises.length) {
					return (
						<Button
							type="text"
							size="small"
							icon={<MdOutlineHandshake />}
							onClick={() => handleOpenMemberEquityPromiseModal(member)}
						>
							<T>Make Promise</T>
						</Button>
					)
				}

				return <Text>{memberShare.promises[0].percentage.toFixed(1)}%</Text>
			},
		},
		{
			title: t('Shares'),
			key: 'shares',
			align: 'center',
			render: (_, member) => {
				const shares = getMemberShare(member.id)

				if (!shares) {
					return <Text type="secondary">-</Text>
				}

				return <Text>{shares.percentage.toFixed(1)}%</Text>
			},
		},

		{
			title: '',
			key: 'actions',
			render: (_, member) => {
				if (!contextProject?.isProjectAuthor || member.status === prismaClient.TeamMemberStatus.Fired) return null

				const items = [
					{
						key: 'edit-promise',
						label: t('Change Promise'),
						disabled: !getMemberShare(member.id)?.promises.length,
						icon: <MdOutlineHandshake size={16} />,
						onClick: () => handleOpenMemberEquityPromiseModal(member),
					},

					// {
					// 	key: 'transfer-share',
					// 	label: t('Transfer Share'),
					// 	icon: <BiTransfer size={16} />,
					// 	disabled: true,
					// },
					{
						type: 'divider',
					},
					{
						key: 'fire-member',
						label: t('Fire Member'),
						icon: <BiTrash size={16} />,
						disabled:
							member.status === prismaClient.TeamMemberStatus.Founder ||
							member.status === (prismaClient.TeamMemberStatus.Fired as any),
						danger: true,
						onClick: () => handleFired(member.id),
					},
				]

				return (
					<Dropdown
						menu={{
							items: items as any,
							onClick: ({ key, domEvent }) => {
								domEvent.stopPropagation()
							},
						}}
						trigger={['click']}
					>
						<Button icon={<TbDotsVertical />} type="text" className="light-gray-text-btn" />
					</Dropdown>
				)
			},
		},
	]

	const pendingInvitationsColumns: ColumnsType<prismaClient.TeamInvitation> = [
		{
			title: t('Email'),
			key: 'email',
			dataIndex: 'email',
		},
		{
			title: t('Position'),
			dataIndex: 'position',
			key: 'position',
		},
		{
			title: t('Invited At'),
			dataIndex: 'createdAt',
			key: 'createdAt',
			responsive: ['md'],
			render: (value) => dayjs(value).format('DD.MM.YYYY'),
		},
		{
			title: t('Expires At'),
			dataIndex: 'expiresAt',
			key: 'expiresAt',
			responsive: ['md'],
			render: (value) => dayjs(value).format('DD.MM.YYYY'),
		},
		{
			key: 'actions',
			title: t('Actions'),
			render: (_, invitation) => (
				<Button danger ghost onClick={() => handleCancelInvitation(invitation.id)}>
					<T>Cancel</T>
				</Button>
			),
		},
	]

	return (
		<>
			{/* Отображение информации о долях проекта */}
			{projectEquity?.data && contextProject?.id && (
				<EquitySection
					projectId={contextProject.id}
					isProjectAuthor={contextProject.isProjectAuthor || false}
					equityData={projectEquity.data}
					teamMembers={team?.data.members || []}
					onManageEquity={handleOpenEquityModal}
				/>
			)}

			{/* Заголовок таблицы участников с кнопкой "Пригласить участника" */}
			<Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
				<h3 style={{ margin: 0 }}>{t('page.project.members.table-title', 'Members')}</h3>

				{contextProject?.isProjectAuthor && (
					<Button type="primary" onClick={handleOpenInviteModal}>
						<T>Invite Member</T>
					</Button>
				)}
			</Flex>

			<ModernTable
				loading={isLoadingMyTeam || isFiring}
				columns={columns}
				dataSource={team?.data.members?.map((m: any) => ({ ...m, key: m.id }))}
				pagination={false}
			/>

			{contextProject?.isProjectAuthor && pendingInvitations?.data && pendingInvitations.data.length > 0 && (
				<>
					<h3 style={{ marginTop: 24 }}>{t('Pending Invitations')}</h3>
					<ModernTable
						loading={isLoadingPendingInvitations || isCanceling}
						columns={pendingInvitationsColumns}
						dataSource={pendingInvitations.data.map((invitation) => ({ ...invitation, key: invitation.id }))}
						pagination={false}
					/>
				</>
			)}

			{contextProject?.teamId && (
				<>
					{contextHolder}
					<InviteMemberModal
						open={isInviteModalOpen}
						onOk={handleInviteSuccess}
						onCancel={handleCloseInviteModal}
						teamId={contextProject?.teamId || ''}
					/>
					<EquityShareModal
						open={isEquityModalOpen}
						onOk={handleEquityUpdateSuccess}
						onCancel={handleCloseEquityModal}
						projectEquity={projectEquity?.data}
					/>
					{selectedMemberId && (
						<MemberEquityPromiseModal
							open={isMemberEquityPromiseModalOpen}
							onOk={handleMemberEquityPromiseUpdateSuccess}
							onCancel={handleCloseMemberEquityPromiseModal}
							onDelete={handleDeleteMemberEquityPromise}
							memberId={selectedMemberId}
							memberName={team?.data.members.find((m: any) => m.id === selectedMemberId)?.user.name || 'Unknown'}
							promiseId={getMemberShare(selectedMemberId)?.promises[0]?.id}
							maxShare={getMaxAvailableShare(getMemberPromisePercentage(selectedMemberId) || 0)}
							projectId={contextProject?.id || ''}
							isVested={getMemberShare(selectedMemberId)?.vested || true}
						/>
					)}
				</>
			)}

			{selectedMemberId && (
				<TeamMemberCard memberId={selectedMemberId} open={showMemberCard} onCancel={handleCloseMemberCard} />
			)}
		</>
	)
}

export default MyTeam
