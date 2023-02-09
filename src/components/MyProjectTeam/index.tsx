import { useEffect, useState } from 'react'
import { fetcher } from '@helpers/fetcher'
import { Button, Grid, message, Space, Table } from 'antd'
import { ColumnsType } from 'antd/lib/table'
import moment from 'moment'
import useSWR from 'swr'

interface TeamMember {
	key: string
	Name: string
	Position: string
	StartedAt: string
	FinishedAt: string
	[key: string]: any
}

interface ProjectVacanciesArgs {
	project: any
	shouldUpdate?: boolean
}

const MyProjectTeam = ({ project, shouldUpdate = false }: ProjectVacanciesArgs) => {
	const screens = Grid.useBreakpoint()
	const [team, setTeam] = useState<any[]>([])
	const {
		data: projectTeam,
		mutate: fetchMyProjectTeam,
		isValidating: isLoadingMyMyProjectTeam,
	} = useSWR({ url: '/api/my/project-team', data: { projectId: project?.id, projectName: project?.Name } }, fetcher, {
		revalidateOnFocus: false,
		isPaused: () => !project,
	})

	useEffect(() => {
		fetchMyProjectTeam()
	}, [shouldUpdate])

	useEffect(() => {
		if (!project) return

		setTeam([
			{
				Name: project['Author Name'][0],
				Position: 'Тимлид',
				'Started At': moment(project['Created']),
				'Finished At': project['Finished'] ? moment(project['Finished']) : undefined,
			},
		])
	}, [project])

	useEffect(() => {
		if (!projectTeam || projectTeam.error) return

		setTeam((previous) => [
			{
				Name: project['Author Name'][0],
				Position: 'Тимлид',
				'Started At': moment(project['Created']),
				'Finished At': project['Finished'] ? moment(project['Finished']) : undefined,
			},
			,
			...projectTeam.data,
		])
	}, [projectTeam])

	const handleFired = async (projectMemberId: string) => {
		try {
			await fetcher({ url: '/api/vacancy/candidate/fired', data: { id: projectMemberId } })
			fetchMyProjectTeam()

			message.success('Сотрудник уволен')
		} catch (error: any) {
			console.log(error)

			message.error(error.message)
		}
	}

	const columns: ColumnsType<TeamMember> = [
		{
			title: 'Имя',
			dataIndex: 'Name',
			key: 'Name',
			render: (value, record) => {
				return screens.md ? (
					value
				) : (
					<>
						<div>{value}</div>
						<small>{record['Position']}</small>
					</>
				)
			},
		},
		{
			title: 'Должность',
			dataIndex: 'Position',
			key: 'Position',
			responsive: ['md'],
		},
		{
			title: 'Период участия',
			dataIndex: 'Started At',
			responsive: ['md'],
			key: 'Started At',
			render(value, record) {
				let startedAt = record['Started At'] ? moment(record['Started At']).format('DD.MM.YYYY') : 'незапамятных времен'
				let finishedAt = record['Finished At'] ? moment(record['Finished At']).format('DD.MM.YYYY') : 'настоящее время'
				return `с ${startedAt} по ${finishedAt}`
			},
		},
		{
			key: 'fire',
			render: (value, record) => {
				if (record.id == team[0].id) return null
				if (record.Status == 'Member') return <Button onClick={() => handleFired(record.id)}>Уволить</Button>
				if (record.Status == 'Fired') return 'Уволен'
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
				loading={isLoadingMyMyProjectTeam}
				style={{ border: '1px solid #aaa', overflow: 'hidden', borderRadius: 16, marginTop: 16 }}
				columns={columns}
				dataSource={team.map((m: any) => ({ ...m, key: m.id }))}
				pagination={false}
			/>
		</>
	)
}

export default MyProjectTeam
