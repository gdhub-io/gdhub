import { useState } from 'react'
import { Project } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { Typography, Button, Grid, List, Space } from 'antd'
import axios from 'axios'
import Link from 'next/link'
import ProjectIdeaModal from '../modals/ProjectIdeaModal'

type ProjectsSectionArgs = {
	seasonId: string
}

export const UserSeasonProjectsSection = ({ seasonId }: ProjectsSectionArgs) => {
	const screens = Grid.useBreakpoint()
	const [showProjectGDDModal, setShowProjectGDDModal] = useState(false)
	const [selectedProjectIdea, setSelectedProjectIdea] = useState<string>()

	const {
		data: projects,
		isFetching: isLoadingUserSeasonProjects,
		refetch: refreshUserProjects,
	} = useQuery(['user-season-projects', seasonId], () =>
		axios.get<Project[]>('/api/user/projects', { params: { seasonId } })
	)

	const handleEditIdeaClick = (projectIdeaId: string) => {
		setSelectedProjectIdea(projectIdeaId)
		setShowProjectGDDModal(true)
	}

	const handleCloseModal = () => {
		setSelectedProjectIdea(undefined)
		setShowProjectGDDModal(false)
	}

	const handleSaveProjectGDD = async () => {
		handleCloseModal()
		refreshUserProjects()
	}

	if (!projects?.data.length) {
		return <p>No project yet.</p>
	}

	return (
		<>
			<List
				itemLayout={screens.xs ? 'vertical' : 'horizontal'}
				loading={isLoadingUserSeasonProjects}
				size="small"
				style={{ marginTop: '20px' }}
				bordered
				dataSource={projects?.data}
				renderItem={(projectIdea: any) => (
					<List.Item>
						<List.Item.Meta
							title={
								<>
									{projectIdea.Name}
									<div style={{ opacity: 0.5, fontSize: '11px' }}>{projectIdea.Genre}</div>
								</>
							}
							description={
								<>
									<Typography.Paragraph ellipsis>{projectIdea.Description}</Typography.Paragraph>
									{!screens.md && !!projectIdea['Document Link'] && (
										<Link href={projectIdea['Document Link']} target="_blank" style={{ marginRight: '40px' }}>
											Концепт
										</Link>
									)}
								</>
							}
						/>
						<Space>
							{screens.md && !!projectIdea['Document Link'] && (
								<Link href={projectIdea['Document Link']} target="_blank" style={{ marginRight: '40px' }}>
									Концепт
								</Link>
							)}
							<Button onClick={() => handleEditIdeaClick(projectIdea.id)}>Внести изменения</Button>
						</Space>
					</List.Item>
				)}
			/>

			<ProjectIdeaModal
				seasonId={seasonId}
				projectIdeaId={selectedProjectIdea}
				open={showProjectGDDModal}
				onOk={handleSaveProjectGDD}
				onCancel={() => setShowProjectGDDModal(false)}
			/>
		</>
	)
}
