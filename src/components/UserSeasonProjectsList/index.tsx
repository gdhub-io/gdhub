import { useState } from 'react'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { GoLinkExternal } from '@react-icons/all-files/go/GoLinkExternal'
import { GoTrash } from '@react-icons/all-files/go/GoTrash'
import { useQuery } from '@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import { T } from '@tolgee/react'
import { Typography, Button, Grid, List, Space, Popconfirm, Badge } from 'antd'
import axios from 'axios'
import Link from 'next/link'

type ProjectsSectionArgs = {
	seasonId: string
	status: ProjectStatus
}

const { Title } = Typography

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
		axios.delete<prismaClient.Project>('/api/user/project', { params: { id } })
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
		return (
			<p>
				<T keyName="no-user-projects" />
			</p>
		)
	}

	return (
		<Space style={{ width: '100%', marginTop: 32 }} direction="vertical">
			<Title level={5}>
				<T keyName="userProjectList" />
			</Title>
			<List
				itemLayout={screens.xs ? 'vertical' : 'horizontal'}
				loading={isLoadingUserSeasonProjects}
				size="small"
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
											<T keyName="concept-link" />
										</Link>
									)}
								</>
							}
						/>
						<Space>
							{screens.md && !!userProject.conceptLink && (
								<Badge count={<GoLinkExternal size={12} color="#afafaf" />} offset={[-32, 4]}>
									<Link href={userProject.conceptLink} target="_blank" style={{ marginRight: '40px' }}>
										<T keyName="concept-link" />
									</Link>
								</Badge>
							)}
							<Button onClick={() => handleEditUserProject(userProject.id)}>
								<T keyName="change" />
							</Button>
							<Popconfirm
								title={<T keyName="are-you-sure-you-want-to-delete-it" />}
								okText={<T keyName="yes" />}
								cancelText={<T keyName="no" />}
								onConfirm={() => handleDeleteIdea(userProject.id)}
							>
								<Button type="text" danger icon={<GoTrash />} />
							</Popconfirm>
						</Space>
					</List.Item>
				)}
			/>
		</Space>
	)
}
