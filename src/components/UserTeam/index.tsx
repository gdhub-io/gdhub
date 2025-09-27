import { useContext } from 'react'
import ModernTable from '@/components/ModernTable'
import tableStyles from '@/components/ModernTable/ModernTable.module.scss'
import UserEquitySection from '@/components/UserEquitySection'
import { ProjectContext } from '@/contexts/ProjectContext'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useQuery } from '@tanstack/react-query'
import { useTranslate } from '@tolgee/react'
import { Grid, Typography, Tag, Space } from 'antd'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'

const { Text } = Typography

const UserTeam = () => {
	const screens = Grid.useBreakpoint()
	const { t } = useTranslate()
	const contextProject = useContext(ProjectContext)?.contextProject

	const { data: team, isLoading: isLoadingMyTeam } = useQuery({
		queryKey: ['user-project-team', contextProject?.teamId],
		queryFn: () =>
			axios.get<prismaClient.Team & { members: (prismaClient.TeamMember & { user: prismaClient.User })[] }>(
				'/api/user/project/team',
				{
					params: { teamId: contextProject?.teamId },
				}
			),
		enabled: !!contextProject?.teamId,
	})

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
						{t('fromToWithDates', 'from {fromDate} to {toDate}', {
							fromDate: startedAt,
							toDate: finishedAt,
						})}
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
	]

	return (
		<>
			<UserEquitySection projectId={contextProject?.id} />

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

export default UserTeam
