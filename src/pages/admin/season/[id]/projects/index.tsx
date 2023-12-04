import { useMemo, useState } from 'react'
import ProjectViewModal from '@/components/modals/ProjectViewModal'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { Project, ProjectStatus, Season, SeasonStage } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { Button, Row, Space, Typography, theme } from 'antd'
import axios from 'axios'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { GoArrowLeft } from 'react-icons/go'
import Board from 'react-trello-ts'
import { BoardData, Lane } from 'react-trello-ts/dist/types/Board'
import styles from './style.module.scss'

const { Title, Text } = Typography

const SeasonProjectIdeasPage: NextPageWithLayout = () => {
	const router = useRouter()
	const { query } = useRouter()
	const { token } = theme.useToken()
	const seasonId = query.id as string
	const [selectedProjectId, setSelectedProjectId] = useState<string>()

	const {
		data: season,
		isLoading,
		refetch: refetchProjects,
	} = useQuery(
		['season-projects', seasonId],
		() =>
			axios.get<Season & { stages: (SeasonStage & { projects: Project[] })[] }>('/api/season', {
				params: { id: seasonId, withProjects: true },
			}),
		{ enabled: !!seasonId }
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

	const handleCardClick = async (projectId: string) => {
		setSelectedProjectId(projectId)
	}

	const handleModalClose = () => {
		setSelectedProjectId(undefined)
	}

	const data: BoardData | undefined = useMemo(() => {
		if (!season?.data) return

		const lanes: Lane[] = season.data.stages.map((stage) => ({
			id: stage.id,
			title: stage.name,
			label: stage.projects.length.toString(),
			cards: stage.projects.map((project) => ({
				id: project.id,
				title: project.name,
				description: project.description?.slice(0, 50),
				label: project.platform,
				droppable: false,
				tags: [
					{
						bgcolor: getTagColor(project.status),
						color: 'white',
						title: project.status,
					},
				],
			})),
		}))

		console.log({ lanes })

		return { lanes }
	}, [season?.data, isLoading])

	return (
		<>
			<Head>
				<title>Проекты на {season?.data.name}</title>
			</Head>
			<Row justify="space-between" align="middle">
				<Space align="center">
					<Link href="/admin/seasons">
						<Button icon={<GoArrowLeft />} type="text" style={{ marginBottom: '0.5em' }} />
					</Link>
					<Title level={2}>Проекты</Title>
					<Text type="secondary">season: {season?.data.name}</Text>
				</Space>
			</Row>
			<div className={styles.board}>
				{!!data && (
					<Board
						id="season-projects-board"
						data={data}
						cardDraggable={false}
						editable={false}
						hideCardDeleteAction={true}
						hideCardDeleteIcon={true}
						draggable={false}
						style={{
							backgroundColor: '#ffffffff',
							borderRadius: 16,
							height: 600,
							maxWidth: '100%',
							border: '2px solid #afafaf',
						}}
						onCardClick={handleCardClick}
					/>
				)}
			</div>

			<ProjectViewModal
				projectId={selectedProjectId}
				open={!!selectedProjectId}
				onCancel={handleModalClose}
				onOk={handleModalClose}
				onUpdate={() => refetchProjects()}
			/>
		</>
	)
}

SeasonProjectIdeasPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default SeasonProjectIdeasPage
