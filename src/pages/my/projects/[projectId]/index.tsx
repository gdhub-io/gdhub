import { useCallback, useState } from 'react'
import ProjectIdeaModal from '@/components/modals/ProjectIdeaModal'
import MyProjectCandidates from '@/components/MyProjectCandidates'
import MyProjectReports from '@/components/MyProjectReports'
import MyProjectTeam from '@/components/MyProjectTeam'
import MyProjectVacancies from '@/components/MyProjectVacancies'
import { fetcher, fetherForMutation } from '@/helpers/fetcher'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { Button, Col, message, Popover, Row, Space, Spin } from 'antd'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { GrUpdate } from 'react-icons/gr'
import { HiExternalLink } from 'react-icons/hi'
import { TbSettings } from 'react-icons/tb'
import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'

const MyProjectPage: NextPageWithLayout = () => {
	const router = useRouter()
	const { projectId } = router.query
	const [showProjectModal, setShowProjectModal] = useState(false)
	const [projectUpdatedEvent, setProjectUpdatedEvent] = useState(false)
	const {
		data: myProject,
		mutate: fetchMyProject,
		isValidating: isLoadingMyProject,
	} = useSWR({ url: '/api/my/project', data: { projectId } }, fetcher, {
		revalidateOnFocus: false,
		refreshInterval: 60000 * 5,
	})

	const { trigger: revalidateProjectPage, isMutating: isRevalidating } = useSWRMutation(
		'/api/revalidate',
		fetherForMutation
	)

	const handleSaveProject = () => {
		setShowProjectModal(false)
		fetchMyProject()
	}

	const handleRevalidatePage = useCallback(async () => {
		if (!myProject) return null

		await revalidateProjectPage({ slug: `/project/${myProject.Slug}` })
		message.success(`Project page "/project/${myProject.Slug}" was refreshed`)
	}, [myProject])

	if (myProject?.isAuthor) {
		return (
			<>
				<Head>
					<title>Проект {myProject?.Name}</title>
				</Head>
				<Spin spinning={isLoadingMyProject}>
					<Row justify="space-between" align="top">
						<Col xs={{ span: 24 }} md={{ span: 12 }}>
							<h1>{myProject?.Name}</h1>
						</Col>
						<Col xs={{ span: 24 }} md={{ span: 12 }} style={{ textAlign: 'right' }}>
							<Space wrap>
								{myProject?.Status !== 'Closed' && (
									<Button onClick={() => setShowProjectModal(true)} icon={<TbSettings size={16} />}>
										Внести изменения
									</Button>
								)}
								<Link href={`/project/${myProject?.Slug || myProject?.id}`} target="_blank">
									<Button type="primary" icon={<HiExternalLink size={16} />}>
										Страница проекта
									</Button>
								</Link>
								<Popover content="Refresh data of the project public page">
									<Button
										type="text"
										onClick={() => handleRevalidatePage()}
										disabled={!myProject}
										loading={isRevalidating}
										icon={<GrUpdate size={16} />}
									></Button>
								</Popover>
							</Space>
						</Col>
					</Row>

					<p style={{ marginTop: 20 }}>{myProject?.Description}</p>

					{!!myProject && (
						<>
							<MyProjectTeam project={myProject} shouldUpdate={projectUpdatedEvent} />
							<MyProjectVacancies project={myProject} />
							<MyProjectCandidates project={myProject} onUpdate={() => setProjectUpdatedEvent(!projectUpdatedEvent)} />
							<MyProjectReports project={myProject} />
						</>
					)}

					<ProjectIdeaModal
						seasonId={myProject?.Season[0]}
						projectIdeaId={projectId}
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
					<title>Проект {myProject?.Name}</title>
				</Head>
				<Spin spinning={isLoadingMyProject}>
					<Row justify="space-between" align="top">
						<Col xs={{ span: 24 }} md={{ span: 12 }}>
							<h1>{myProject?.Name}</h1>
						</Col>
						<Col xs={{ span: 24 }} md={{ span: 12 }} style={{ textAlign: 'right' }}>
							<Space wrap>
								<Link href={`/project/${myProject?.Slug || myProject?.id}`} target="_blank">
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

					<p style={{ marginTop: 20 }}>{myProject?.Description}</p>

					{!!myProject && (
						<>
							<MyProjectTeam project={myProject} shouldUpdate={projectUpdatedEvent} />
						</>
					)}
				</Spin>
			</>
		)
	}
}

MyProjectPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default MyProjectPage
