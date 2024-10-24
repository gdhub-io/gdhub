import { useContext } from 'react'
import { ProjectContext } from '@/contexts/ProjectContext'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Grid, message, Table } from 'antd'
import { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs from 'dayjs'

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
				return screens.md ? (
					member.user.name
				) : (
					<>
						<div>{member.user.name}</div>
						<small>
							{member.status == prismaClient.TeamMemberStatus.Founder
								? `${member.position} (founder)`
								: member.position}
						</small>
					</>
				)
			},
		},
		{
			title: t('Position'),
			dataIndex: 'position',
			key: 'position',
			responsive: ['md'],
			render: (value, member) => {
				return member.status == prismaClient.TeamMemberStatus.Founder ? `${value} (founder)` : value
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
			title: 'Status',
			render: (value, member) => {
				if (member.status == prismaClient.TeamMemberStatus.Founder) return null

				if (member.status == prismaClient.TeamMemberStatus.Hired)
					return (
						<Button onClick={() => handleFired(member.id)}>
							<T>Fire</T>
						</Button>
					)
				if (member.status == prismaClient.TeamMemberStatus.Fired) return t('Fired')
			},
		},
	]

	return (
		<Table
			// showHeader={false}
			loading={isLoadingMyTeam || isFiring}
			style={{ border: '1px solid #aaa', overflow: 'hidden', borderRadius: 16, marginTop: 16 }}
			columns={columns}
			dataSource={team?.data.members?.map((m: any) => ({ ...m, key: m.id }))}
			pagination={false}
		/>
	)
}

export default MyTeam
