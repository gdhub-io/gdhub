import { useEffect, useState } from 'react'
import ProjectModal from '@/components/modals/ProjectModal'
import MyProjectCandidates from '@/components/MyProjectCandidates'
import MyProjectReports from '@/components/MyProjectReports'
import MyProjectVacancies from '@/components/MyProjectVacancies'
import MyTeam from '@/components/MyTeam'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { Project, ProjectStatus, SeasonStage } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { Button, Col, Row, Space, Spin } from 'antd'
import axios from 'axios'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { HiExternalLink } from 'react-icons/hi'
import { TbSettings } from 'react-icons/tb'

const MyProjectPage: NextPageWithLayout = () => {
	const router = useRouter()
	const projectId = router.query.projectId as string
	const [showProjectModal, setShowProjectModal] = useState(false)

	useEffect(() => {
		console.log('projectId', projectId)
	}, [router])

	const {
		data: myProject,
		isLoading: isLoadingMyProject,
		refetch: fetchMyProject,
	} = useQuery(
		['user-project', projectId],
		() => axios.get<Project & { stage: SeasonStage }>('/api/user/project', { params: { projectId } }),
		{
			enabled: !!projectId,
			refetchInterval: 60000 * 5,
			refetchOnWindowFocus: false,
		}
	)

	const handleSaveProject = () => {
		setShowProjectModal(false)
		fetchMyProject()
	}

	if (myProject?.data) {
		return (
			<>
				<Head>
					<title>Управление проектом</title>
				</Head>
				<Spin spinning={isLoadingMyProject}>
					<Row justify="space-between" align="top">
						<Col xs={{ span: 24 }} md={{ span: 12 }}>
							<h1>{myProject?.data.name}</h1>
						</Col>
						<Col xs={{ span: 24 }} md={{ span: 12 }} style={{ textAlign: 'right' }}>
							<Space wrap>
								{myProject?.data.status !== ProjectStatus.Rejected && (
									<Button onClick={() => setShowProjectModal(true)} icon={<TbSettings size={16} />}>
										Настройки
									</Button>
								)}
								<Link href={`/project/${myProject?.data.slug || myProject?.data.id}`} target="_blank">
									<Button type="primary" icon={<HiExternalLink size={16} />}>
										Страница проекта
									</Button>
								</Link>
							</Space>
						</Col>
					</Row>

					<p style={{ marginTop: 20 }}>{myProject?.data.description}</p>

					{!!myProject.data && (
						<>
							<MyTeam teamId={myProject.data.teamId} />
							<MyProjectVacancies teamId={myProject.data.teamId} />
							<MyProjectCandidates project={myProject.data} />
							<MyProjectReports project={myProject.data} />
						</>
					)}

					<ProjectModal
						seasonId={myProject?.data.stage.seasonId}
						projectId={projectId}
						open={showProjectModal}
						onOk={handleSaveProject}
						onCancel={() => setShowProjectModal(false)}
					/>
				</Spin>
			</>
		)
	} else {
		return (
			<>
				<Head>
					<title>Управление проектом</title>
				</Head>
				<Spin spinning={isLoadingMyProject}>
					<Row justify="space-between" align="top">
						<Col xs={{ span: 24 }} md={{ span: 12 }}>
							<h1>{myProject?.data.name}</h1>
						</Col>
						<Col xs={{ span: 24 }} md={{ span: 12 }} style={{ textAlign: 'right' }}>
							<Space wrap>
								<Link href={`/project/${myProject?.data.slug || myProject?.data.id}`} target="_blank">
									<Button
										type="primary"
										icon={<HiExternalLink size={16} style={{ position: 'relative', top: '3px', marginRight: '6px' }} />}
									>
										Страница проекта
									</Button>
								</Link>
							</Space>
						</Col>
					</Row>

					<p style={{ marginTop: 20 }}>{myProject?.data.description}</p>

					{!!myProject?.data && <>{/* <MyTeam project={myProject.data} shouldUpdate={projectUpdatedEvent} /> */}</>}
				</Spin>
			</>
		)
	}
}

MyProjectPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default MyProjectPage
