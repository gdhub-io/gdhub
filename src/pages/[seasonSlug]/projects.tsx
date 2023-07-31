import { useMemo } from 'react'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { Project, ProjectStatus, Season, SeasonStage } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { message, theme } from 'antd'
import axios from 'axios'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Board from 'react-trello-ts'
import { BoardData } from 'react-trello-ts/dist/types/Board'

const SeasonProjectIdeasPage: NextPageWithLayout = () => {
	const { query } = useRouter()
	const { token } = theme.useToken()
	const seasonSlug = query.seasonSlug as string

	const { data: season } = useQuery(
		['season-projects', seasonSlug],
		() =>
			axios.get<Season & { stages: (SeasonStage & { projects: Project[] })[] }>('/api/season', {
				params: { slug: seasonSlug, withProjects: true },
			}),
		{ enabled: !!seasonSlug }
	)

	const getTagColor = (status: ProjectStatus) => {
		switch (status) {
			case ProjectStatus.Registered:
				return token.blue
			case ProjectStatus.Approved:
				return token.green
			case ProjectStatus.Rejected:
				return token.red
			case ProjectStatus.Done:
				return token.colorFillSecondary
		}
	}

	const data: BoardData | undefined = useMemo(() => {
		if (!season) return

		return {
			lanes: season?.data.stages.map((stage) => ({
				id: stage.id,
				title: stage.name,
				label: stage.projects.length.toString(),
				cards: stage.projects.map((project) => ({
					id: project.id,
					title: project.name,
					description: project.description?.slice(0, 50),
					label: project.platform,
					metadata: { someParam: 'be312a1' },
					tags: [
						{
							bgcolor: getTagColor(project.status),
							color: 'white',
							title: project.status,
						},
					],
				})),
			})),
		}
	}, [season])

	return (
		<>
			<Head>
				<title>Проекты на {season?.data.name}</title>
			</Head>
			<h1>Проекты на {season?.data.name}</h1>
			<div>
				{!!data && (
					<Board
						data={data}
						cardDraggable={false}
						editable={false}
						draggable={false}
						hideCardDeleteAction={true}
						hideCardDeleteIcon={true}
						style={{
							backgroundColor: '#eee',
							borderRadius: 16,
							height: 600,
						}}
						cardStyle={{
							borderRadius: 8,
						}}
						laneStyle={{
							borderRadius: 12,
						}}
						onCardClick={(card, meta: any) => {
							message.info(meta.someParam)
						}}
					/>
				)}
			</div>
		</>
	)
}

SeasonProjectIdeasPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default SeasonProjectIdeasPage
