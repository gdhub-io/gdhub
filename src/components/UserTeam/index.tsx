import { useContext, useState } from 'react'
import ModernTable from '@/components/ModernTable'
import tableStyles from '@/components/ModernTable/ModernTable.module.scss'
import { ProjectContext } from '@/contexts/ProjectContext'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Grid, Typography, Tag, Space } from 'antd'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'

const { Text } = Typography

const MyTeam = () => {
	const screens = Grid.useBreakpoint()
	const { t } = useTolgee()
	const contextProject = useContext(ProjectContext)?.contextProject
	const [isMemberEquityPromiseModalOpen, setIsMemberEquityPromiseModalOpen] = useState(false)
	const [selectedMember, setSelectedMember] = useState<(prismaClient.TeamMember & { user: prismaClient.User }) | null>(
		null
	)

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
		data: memberEquity,
		refetch: fetchMemberEquity,
		isLoading: isLoadingMemberEquity,
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
	]

	return (
		<>
			{/* Отображение информации о долях проекта */}
			{memberEquity?.data && contextProject?.id && (
				<></>
				// <UserEquitySection
				// 	projectId={contextProject.id}
				// 	isProjectAuthor={contextProject.isProjectAuthor || false}
				// 	equityData={projectEquity.data}
				// 	teamMembers={team?.data.members || []}
				// 	onManageEquity={handleOpenEquityModal}
				// />
			)}

			<h3 style={{ margin: 0 }}>{t('page.project.members.table-title', 'Members')}</h3>

			<ModernTable
				loading={isLoadingMyTeam}
				columns={columns}
				dataSource={team?.data.members?.map((m: any) => ({ ...m, key: m.id }))}
				pagination={false}
			/>
		</>
	)
}

export default MyTeam
