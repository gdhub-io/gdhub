import { Project, ProjectStatus, Season, SeasonStage, User, UserRole } from '@prisma/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button, Descriptions, List, Modal, Select, Space, Spin, Typography, theme } from 'antd'
import axios from 'axios'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { GoLinkExternal } from 'react-icons/go'

const { Paragraph, Title, Text } = Typography

type ProjectViewModalParams = {
	projectId?: string
	open: boolean
	onOk: () => void
	onCancel: () => void
	onUpdate: () => void
}

const ProjectViewModal = ({ projectId, open, onOk, onCancel, onUpdate }: ProjectViewModalParams) => {
	const { token } = theme.useToken()
	const { data: session } = useSession()
	const {
		data: project,
		isLoading,
		refetch,
	} = useQuery(
		['user-project', projectId],
		() =>
			axios.get<Project & { author: User; stage: SeasonStage & { season: Season } }>('/api/project/details', {
				params: { projectId },
			}),
		{
			enabled: !!projectId,
			refetchOnWindowFocus: false,
			refetchInterval: Infinity,
		}
	)

	const { mutateAsync: moveCardToStage } = useMutation((data: any) => axios.put<void>(`/api/project/move`, data))
	const { mutateAsync: changeProjectStatus } = useMutation((data: any) => axios.put<void>(`/api/project/status`, data))

	const statusesOptions = Object.values(ProjectStatus).map((s) => ({ title: s, value: s }))

	const getTagColor = (status: ProjectStatus) => {
		switch (status) {
			case ProjectStatus.Registered:
				return token.blue3
			case ProjectStatus.Approved:
				return token.green3
			case ProjectStatus.Rejected:
				return token.red3
			case ProjectStatus.Done:
				return token.colorFillSecondary
		}
	}

	const handleCancel = () => {
		onCancel()
	}

	const handleMoveNext = async () => {
		const { status } = await moveCardToStage({ projectId, targetStageId: 'next' })
		if (status == 204) {
			await refetch()
			onUpdate()
		}
	}

	const handleMovePrevious = async () => {
		const { status } = await moveCardToStage({ projectId, targetStageId: 'previous' })
		if (status == 204) {
			await refetch()
			onUpdate()
		}
	}

	const handleChangeStatus = async (newStatus: ProjectStatus) => {
		const { status } = await changeProjectStatus({ projectId, newStatus })
		if (status == 204) {
			await refetch()
			onUpdate()
		}
	}

	if (!project) return null

	return (
		<Modal
			centered
			title={'Project Details'}
			width={800}
			destroyOnClose
			cancelText="Закрыть"
			okButtonProps={{ hidden: true }}
			okText={null}
			open={open}
			onCancel={handleCancel}
			footer={
				<Space>
					<Button onClick={handleCancel}>Закрыть</Button>
					{session?.user.roles.includes(UserRole.Admin) && (
						<>
							{!!project?.data.stage.order && <Button onClick={handleMovePrevious}>Двигать назад</Button>}
							<Button onClick={handleMoveNext} type="primary">
								Двигать вперед
							</Button>
						</>
					)}
				</Space>
			}
		>
			<Spin spinning={isLoading}>
				{!!project?.data.coverImage && <Image src={project?.data.coverImage} alt="" />}
				<Descriptions column={1}>
					<Descriptions.Item label="Name">
						<strong>{project?.data.name}</strong>
					</Descriptions.Item>
					<Descriptions.Item label="Pipe">
						{project?.data.stage.season.name} / {project?.data.stage.name}
					</Descriptions.Item>
					<Descriptions.Item label="Статус" style={{}} contentStyle={{ color: 'red' }}>
						<Select
							bordered={false}
							defaultValue={project.data.status}
							options={statusesOptions}
							onChange={handleChangeStatus}
							style={{ width: '200px', backgroundColor: getTagColor(project.data.status), borderRadius: 8 }}
						/>
					</Descriptions.Item>
					<Descriptions.Item label="Автор">{project?.data.author.name}</Descriptions.Item>
					<Descriptions.Item label="Жанр">{project?.data.genre}</Descriptions.Item>
					<Descriptions.Item label="Сеттинг">{project?.data.setting}</Descriptions.Item>
					<Descriptions.Item label="Аудитория">{project?.data.audition}</Descriptions.Item>
					<Descriptions.Item label="Основные механики">{project?.data.coreMechanics.join(', ')}</Descriptions.Item>
					<Descriptions.Item label="Платформа">{project?.data.platform}</Descriptions.Item>
					<Descriptions.Item label="Описание">{project?.data.description}</Descriptions.Item>
				</Descriptions>

				<Paragraph style={{ marginTop: 24 }}>
					<Title level={5}>Приложения</Title>
					<List>
						{!!project.data.conceptLink && (
							<List.Item>
								<Link href={project.data.conceptLink} target="_blank">
									Концепт-документ <GoLinkExternal />
								</Link>
							</List.Item>
						)}

						{!!project.data.gddLink && (
							<List.Item>
								<Link href={project.data.gddLink} target="_blank">
									ГДД <GoLinkExternal />
								</Link>
							</List.Item>
						)}

						{!!project.data.pitchdeckLink && (
							<List.Item>
								<Link href={project.data.pitchdeckLink} target="_blank">
									Питчдек <GoLinkExternal />
								</Link>
							</List.Item>
						)}

						{!!project.data.videoLink && (
							<List.Item>
								<Link href={project.data.videoLink} target="_blank">
									Видео питча <GoLinkExternal />
								</Link>
							</List.Item>
						)}
					</List>
				</Paragraph>
			</Spin>
		</Modal>
	)
}

export default ProjectViewModal
