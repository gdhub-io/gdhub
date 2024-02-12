import { Team, TeamMember, TeamMemberStatus, User } from '@prisma/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button, Grid, message, Space, Table } from 'antd'
import { ColumnsType } from 'antd/lib/table'
import axios from 'axios'
import dayjs from 'dayjs'

interface ProjectVacanciesArgs {
	teamId: string
}

const MyTeam = ({ teamId }: ProjectVacanciesArgs) => {
	const screens = Grid.useBreakpoint()

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

			message.success('Сотрудник уволен')
		} catch (error: any) {
			console.log(error)

			message.error(error.message)
		}
	}

	const columns: ColumnsType<TeamMember & { user: User }> = [
		{
			title: 'Имя',
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
			title: 'Роль на проекте',
			dataIndex: 'position',
			key: 'position',
			responsive: ['md'],
			render: (value, member) => {
				return member.status == TeamMemberStatus.Founder ? `${value} (founder)` : value
			},
		},
		{
			title: 'Период участия',
			dataIndex: 'startedAt',
			responsive: ['md'],
			key: 'startedAt',
			render(value, member) {
				let startedAt = dayjs(member.startedAt).format('DD.MM.YYYY')
				let finishedAt = member.finishedAt ? dayjs(member.finishedAt).format('DD.MM.YYYY') : 'настоящее время'
				return `с ${startedAt} по ${finishedAt}`
			},
		},
		{
			key: 'fire',
			render: (value, member) => {
				if (member.status == TeamMemberStatus.Founder) return null

				if (member.status == TeamMemberStatus.Hired)
					return <Button onClick={() => handleFired(member.id)}>Уволить</Button>
				if (member.status == TeamMemberStatus.Fired) return 'Уволен'
			},
		},
	]

	return (
		<>
			<Space align="center" style={{ marginTop: 60 }}>
				<h3 style={{ margin: 0 }}>Команда проекта</h3>
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
