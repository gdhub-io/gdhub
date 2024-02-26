import { Team, TeamMember, TeamMemberStatus, User } from '@prisma/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Grid, message, Space, Table } from 'antd'
import { ColumnsType } from 'antd/lib/table'
import axios from 'axios'
import dayjs from 'dayjs'

interface ProjectVacanciesArgs {
	teamId: string
}

const MyTeam = ({ teamId }: ProjectVacanciesArgs) => {
	const screens = Grid.useBreakpoint()
	const { t } = useTolgee()

	const {
		data: team,
		refetch: fetchMyTeam,
		isLoading: isLoadingMyTeam,
	} = useQuery(
		['user-project-team', teamId],
		() =>
			axios.get<Team & { members: (TeamMember & { user: User })[] }>('/api/user/project/team', {
				params: { teamId },
			}),
		{
			enabled: !!teamId,
			// refetchOnWindowFocus: false,
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

	const columns: ColumnsType<TeamMember & { user: User }> = [
		{
			title: t('Full Name'),
			key: 'userName',
			render: (_, member) => {
				return screens.md ? (
					member.user.name
				) : (
					<>
						<div>{member.user.name}</div>
						<small>
							{member.status == TeamMemberStatus.Founder ? `${member.position} (founder)` : member.position}
						</small>
					</>
				)
			},
		},
		{
			title: t('The role on the project'),
			dataIndex: 'position',
			key: 'position',
			responsive: ['md'],
			render: (value, member) => {
				return member.status == TeamMemberStatus.Founder ? `${value} (founder)` : value
			},
		},
		{
			title: t('The period of participation'),
			dataIndex: 'startedAt',
			responsive: ['md'],
			key: 'startedAt',
			render(value, member) {
				let startedAt = dayjs(member.startedAt).format('DD.MM.YYYY')
				let finishedAt = member.finishedAt ? dayjs(member.finishedAt).format('DD.MM.YYYY') : t('present')
				return (
					<T
						keyName="fromToWithDates"
						defaultValue="from {fromDate} to {toDate}"
						params={{ fromDate: startedAt, toDate: finishedAt }}
					/>
				)
			},
		},
		{
			key: 'fire',
			render: (value, member) => {
				if (member.status == TeamMemberStatus.Founder) return null

				if (member.status == TeamMemberStatus.Hired)
					return (
						<Button onClick={() => handleFired(member.id)}>
							<T>Fire</T>
						</Button>
					)
				if (member.status == TeamMemberStatus.Fired) return t('Fired')
			},
		},
	]

	return (
		<>
			<Space align="center" style={{ marginTop: 60 }}>
				<h3 style={{ margin: 0 }}>
					<T>The project team</T>
				</h3>
			</Space>

			<Table
				showHeader={false}
				loading={isLoadingMyTeam}
				style={{ border: '1px solid #aaa', overflow: 'hidden', borderRadius: 16, marginTop: 16 }}
				columns={columns}
				dataSource={team?.data.members?.map((m: any) => ({ ...m, key: m.id }))}
				pagination={false}
			/>
		</>
	)
}

export default MyTeam
