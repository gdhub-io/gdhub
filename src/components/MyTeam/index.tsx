import { useContext } from 'react'
import ModernTable from '@/components/common/ModernTable'
import { ProjectContext } from '@/contexts/ProjectContext'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Grid, message, Flex, Typography, Tag, Space } from 'antd'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'
import tableStyles from '@/components/ModernTable/ModernTable.module.scss'

const { Text } = Typography

const MyTeam = () => {
	const screens = Grid.useBreakpoint()
	const { t } = useTolgee()
	const contextProject = useContext(ProjectContext)?.contextProject

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

	const { mutateAsync: fireMember, isLoading: isFiring } = useMutation(
		(data: { id: string }) => axios.put<void>('/api/user/project/vacancy/candidate/fire', data),
		{
			onSuccess: () => {
				fetchMyTeam()
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

	return (
		<>
			{Boolean(contextProject?.isProjectAuthor) && (
				<Flex justify="space-between" align="center" wrap>
					<h3 style={{ margin: 0 }}>{t('page.project.members.table-title', 'Members')}</h3>

					{contextProject?.isProjectAuthor && (
						<Button type="primary">
							<T>Join Member</T>
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
		</>
	)
}

export default MyTeam
