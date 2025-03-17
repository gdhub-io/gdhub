import { useContext, useState } from 'react'
import InviteMemberModal from '@/components/modals/InviteMemberModal'
import ModernTable from '@/components/ModernTable'
import tableStyles from '@/components/ModernTable/ModernTable.module.scss'
import { ProjectContext } from '@/contexts/ProjectContext'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Grid, message, Flex, Typography, Tag, Space } from 'antd'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'

const { Text } = Typography

const MyTeam = () => {
	const screens = Grid.useBreakpoint()
	const { t } = useTolgee()
	const contextProject = useContext(ProjectContext)?.contextProject
	const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)

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

	const handleFired = async (teamMemberId: string) => {
		try {
			await fireMember({ id: teamMemberId })
			fetchMyTeam()

			message.success(t('The employee is dismissed'))
		} catch (error: any) {
			console.log(error)

			message.error(error.message)
		}
	}

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

	const columns: ColumnsType<prismaClient.TeamMember & { user: prismaClient.User }> = [
		{
			title: t('Member Name'),
			key: 'userName',
			render: (_, member) => {
				return (
					<Space direction="vertical" size={0}>
						<Text className={tableStyles.tableMemberName}>{member.user.name}</Text>
						{!screens.md && (
							<Text className={tableStyles.tableMemberPosition}>
								{member.status === prismaClient.TeamMemberStatus.Founder
									? `${member.position} (founder)`
									: member.position}
							</Text>
						)}
					</Space>
				)
			},
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
			key: 'fire',
			hidden: !contextProject?.isProjectAuthor,
			title: 'Status',
			render: (value, member) => {
				if (member.status === prismaClient.TeamMemberStatus.Founder) {
					return null
				}

				if (member.status === prismaClient.TeamMemberStatus.Hired) {
					return (
						<Button danger ghost onClick={() => handleFired(member.id)}>
							<T>Fire</T>
						</Button>
					)
				}

				if (member.status === prismaClient.TeamMemberStatus.Fired) {
					return <Text className={tableStyles.tableStatusFired}>{t('Fired')}</Text>
				}

				return null
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
			{Boolean(contextProject?.isProjectAuthor) && (
				<Flex justify="space-between" align="center" wrap>
					<h3 style={{ margin: 0 }}>{t('page.project.members.table-title', 'Members')}</h3>

					{/* temp */}
					{contextProject?.isProjectAuthor && process.env.NODE_ENV !== 'production' && (
						<Button type="primary" onClick={handleOpenInviteModal}>
							<T>Invite Member</T>
						</Button>
					)}
				</Flex>
			)}
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
				<InviteMemberModal
					teamId={contextProject.teamId}
					open={isInviteModalOpen}
					onOk={handleInviteSuccess}
					onCancel={handleCloseInviteModal}
				/>
			)}
		</>
	)
}

export default MyTeam
