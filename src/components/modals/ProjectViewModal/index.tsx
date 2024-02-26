import { Project, ProjectStatus, Season, SeasonStage, User, UserRole } from '@prisma/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Descriptions, List, Modal, Select, Space, Spin, Typography, theme } from 'antd'
import axios from 'axios'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { GoLinkExternal } from 'react-icons/go'
import styles from './style.module.scss'

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
	const { t } = useTolgee()
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
			cancelText={<T>Close</T>}
			okButtonProps={{ hidden: true }}
			okText={null}
			open={open}
			onCancel={handleCancel}
			footer={
				<Space>
					<Button onClick={handleCancel}>
						<T>Close</T>
					</Button>
					{session?.user.roles.includes(UserRole.Admin) && (
						<>
							{!!project?.data.stage.order && (
								<Button onClick={handleMovePrevious}>
									<T>Move back</T>
								</Button>
							)}
							<Button onClick={handleMoveNext} type="primary">
								<T>Move forward</T>
							</Button>
						</>
					)}
				</Space>
			}
		>
			<Spin spinning={isLoading}>
				<div className={styles.cover}>
					{!!project?.data.coverImage && <Image src={project?.data.coverImage} alt="" fill />}
				</div>
				<Descriptions column={1}>
					<Descriptions.Item label={t('Name')}>
						<strong>{project?.data.name}</strong>
					</Descriptions.Item>
					<Descriptions.Item label={t('Pipe')}>
						{project?.data.stage.season.name} / {project?.data.stage.name}
					</Descriptions.Item>
					<Descriptions.Item label={t('Status')} style={{}} contentStyle={{ color: 'red' }}>
						<Select
							bordered={false}
							defaultValue={project.data.status}
							options={statusesOptions}
							onChange={handleChangeStatus}
							style={{ width: '200px', backgroundColor: getTagColor(project.data.status), borderRadius: 8 }}
						/>
					</Descriptions.Item>
					<Descriptions.Item label={t('Author')}>{project?.data.author.name}</Descriptions.Item>
					<Descriptions.Item label={t('Genre')}>{project?.data.genre}</Descriptions.Item>
					<Descriptions.Item label={t('Game Setting')}>{project?.data.setting}</Descriptions.Item>
					<Descriptions.Item label={t('Audience')}>{project?.data.audition}</Descriptions.Item>
					<Descriptions.Item label={t('Core mechanics')}>{project?.data.coreMechanics.join(', ')}</Descriptions.Item>
					<Descriptions.Item label={t('Platform')}>{project?.data.platform}</Descriptions.Item>
					<Descriptions.Item label={t('Description')}>{project?.data.description}</Descriptions.Item>
				</Descriptions>

				<Paragraph style={{ marginTop: 24 }}>
					<Title level={5}>
						<T>Appendix</T>
					</Title>
					<List>
						{!!project.data.conceptLink && (
							<List.Item>
								<Link href={project.data.conceptLink} target="_blank">
									<T>Concept document</T> <GoLinkExternal />
								</Link>
							</List.Item>
						)}

						{!!project.data.gddLink && (
							<List.Item>
								<Link href={project.data.gddLink} target="_blank">
									<T>GDD</T> <GoLinkExternal />
								</Link>
							</List.Item>
						)}

						{!!project.data.pitchdeckLink && (
							<List.Item>
								<Link href={project.data.pitchdeckLink} target="_blank">
									<T>Pitch deck</T> <GoLinkExternal />
								</Link>
							</List.Item>
						)}

						{!!project.data.videoLink && (
							<List.Item>
								<Link href={project.data.videoLink} target="_blank">
									<T>Pitch video</T> <GoLinkExternal />
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
