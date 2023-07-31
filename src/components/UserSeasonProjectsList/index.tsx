import { useState } from 'react'
import { Project, ProjectStatus } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import { Typography, Button, Grid, List, Space, Popconfirm, Badge } from 'antd'
import axios from 'axios'
import Link from 'next/link'
import { GoLinkExternal } from 'react-icons/go'
import { HiOutlineTrash } from 'react-icons/hi'
import ProjectModal from '../modals/ProjectModal'

type ProjectsSectionArgs = {
	seasonId: string
	status: ProjectStatus
}

export const UserSeasonProjectsList = ({ seasonId, status }: ProjectsSectionArgs) => {
	const screens = Grid.useBreakpoint()
	const [showUserProjectModal, setShowUserProjectModal] = useState(false)
	const [selectedProject, setSelectedProject] = useState<string>()

	const {
		data: projects,
		isFetching: isLoadingUserSeasonProjects,
		refetch: refreshUserProjects,
	} = useQuery(
		['user-season-projects', seasonId],
		() => axios.get<Project[]>('/api/user/projects', { params: { seasonId, status } }),
		{ refetchInterval: Infinity, refetchOnWindowFocus: false }
	)

	const { mutateAsync: deleteProject } = useMutation(({ id }: { id: string }) =>
		axios.delete<Project>('/api/user/project', { params: { id } })
	)

	const handleEditUserProject = (userProjectId: string) => {
		setSelectedProject(userProjectId)
		setShowUserProjectModal(true)
	}

	const handleCloseModal = () => {
		setSelectedProject(undefined)
		setShowUserProjectModal(false)
	}

	const handleSaveUserProject = async () => {
		handleCloseModal()
		refreshUserProjects()
	}

	const handleDeleteIdea = async (projectId: string) => {
		await deleteProject({ id: projectId })
		await refreshUserProjects()
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
				renderItem={(userProject) => (
					<List.Item>
						<List.Item.Meta
							title={
								<>
									{userProject.name}
									<div style={{ opacity: 0.5, fontSize: '11px' }}>{userProject.genre}</div>
								</>
							}
							description={
								<>
									<Typography.Paragraph ellipsis>{userProject.description}</Typography.Paragraph>
									{!screens.md && !!userProject.conceptLink && (
										<Link href={userProject.conceptLink} target="_blank" style={{ marginRight: '40px' }}>
											Ссылка на документ
										</Link>
									)}
								</>
							}
						/>
						<Space>
							{screens.md && !!userProject.conceptLink && (
								<Badge count={<GoLinkExternal size={12} color="#afafaf" />} offset={[-32, 4]}>
									<Link href={userProject.conceptLink} target="_blank" style={{ marginRight: '40px' }}>
										Концепт
									</Link>
								</Badge>
							)}
							<Button onClick={() => handleEditUserProject(userProject.id)}>Изменить</Button>
							<Popconfirm
								title="Точно хотите удалить？"
								okText="Да"
								cancelText="Нет"
								onConfirm={() => handleDeleteIdea(userProject.id)}
							>
								<Button type="text" danger>
									<HiOutlineTrash />
								</Button>
							</Popconfirm>
						</Space>
					</List.Item>
				)}
			/>

			<ProjectModal
				projectId={selectedProject}
				open={showUserProjectModal}
				onOk={handleSaveUserProject}
				onCancel={() => setShowUserProjectModal(false)}
			/>
		</>
	)
}
