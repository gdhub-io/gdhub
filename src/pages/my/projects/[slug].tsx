import { useState } from 'react'
import ProjectModal from '@/components/modals/ProjectModal'
import MyProjectCandidates from '@/components/MyProjectCandidates'
import MyProjectReports from '@/components/MyProjectReports'
import MyProjectVacancies from '@/components/MyProjectVacancies'
import MyTeam from '@/components/MyTeam'
import { ProtectedProjectLayout } from '@/layouts/ProtectedProjectLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { Project, SeasonStage } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Col, Row, Space, Spin, Typography } from 'antd'
import axios from 'axios'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { HiExternalLink } from 'react-icons/hi'
import { TbSettings } from 'react-icons/tb'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'

const { Text } = Typography

const MyProjectPage: NextPageWithLayout = () => {
	const router = useRouter()
	const { t } = useTolgee()
	const slug = router.query.slug as string
	const [showProjectModal, setShowProjectModal] = useState(false)

	const {
		data: myProject,
		isLoading: isLoadingMyProject,
		refetch: fetchMyProject,
	} = useQuery(
		['user-project', slug],
		() => axios.get<Project & { stage: SeasonStage }>('/api/user/project', { params: { slug } }),
		{
			enabled: !!slug,
			refetchInterval: 60000 * 5,
			refetchOnWindowFocus: false,
		}
	)

	const handleSaveProject = () => {
		if (!myProject) return

		setShowProjectModal(false)
		fetchMyProject()
	}

	if (myProject?.data) {
		return (
			<ProtectedProjectLayout title={t('Project Management')}>
				<Spin spinning={isLoadingMyProject}>
					<Row justify="space-between" align="top">
						<Col xs={{ span: 24 }} md={{ span: 12 }}>
							<h1>{myProject?.data.name}</h1>
						</Col>
						<Col xs={{ span: 24 }} md={{ span: 12 }} style={{ textAlign: 'right' }}>
							<Space wrap>
								<Button onClick={() => setShowProjectModal(true)} icon={<TbSettings size={16} />}>
									<T>Settings</T>
								</Button>
								<Link href={`/project/${myProject?.data.slug || myProject?.data.id}`} target="_blank">
									<Button type="primary" icon={<HiExternalLink size={16} />}>
										<T>Project page</T>
									</Button>
								</Link>
							</Space>
						</Col>
					</Row>

					{/* <p style={{ marginTop: 20 }}>{myProject?.data.description}</p> */}
					<Text style={{ marginTop: 20 }}>
						<ReactMarkdown rehypePlugins={[rehypeRaw as any]}>{myProject?.data.description || ''}</ReactMarkdown>
					</Text>

					{!!myProject.data && (
						<>
							<MyTeam teamId={myProject.data.teamId} />
							<MyProjectVacancies teamId={myProject.data.teamId} project={myProject.data} />
							<MyProjectCandidates project={myProject.data} />
							<MyProjectReports project={myProject.data} />
						</>
					)}

					<ProjectModal
						seasonId={myProject?.data.stage.seasonId}
						projectId={myProject?.data.id}
						open={showProjectModal}
						onOk={handleSaveProject}
						onCancel={() => setShowProjectModal(false)}
					/>
				</Spin>
			</ProtectedProjectLayout>
		)
	} else {
		return (
			<ProtectedProjectLayout title={t('Project Management')}>
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
										<T>Project page</T>
									</Button>
								</Link>
							</Space>
						</Col>
					</Row>

					<p style={{ marginTop: 20 }}>{myProject?.data.description}</p>

					{!!myProject?.data && <>{/* <MyTeam project={myProject.data} shouldUpdate={projectUpdatedEvent} /> */}</>}
				</Spin>
			</ProtectedProjectLayout>
		)
	}
}

export default MyProjectPage
