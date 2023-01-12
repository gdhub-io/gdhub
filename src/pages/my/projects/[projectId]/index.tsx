import { useState } from 'react'
import MyProjectCandidates from '@components/MyProjectCandidates'
import MyProjectTeam from '@components/MyProjectTeam'
import MyProjectVacancies from '@components/MyProjectVacancies'
import ProjectIdeaModal from '@components/SeasonsList/modals/ProjectIdeaModal'
import { fetcher } from '@helpers/fetcher'
import { ProtectedLayout } from '@layouts/ProtectedLayout'
import { NextPageWithLayout } from 'pages/_app'
import { authOptions } from 'pages/api/auth/[...nextauth]'
import { Button, Col, Row, Space } from 'antd'
import { GetServerSidePropsContext } from 'next'
import { unstable_getServerSession } from 'next-auth'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { HiExternalLink } from 'react-icons/hi'
import { TbSettings } from 'react-icons/tb'
import useSWR from 'swr'

const MyProjectPage: NextPageWithLayout = () => {
	const router = useRouter()
	const { projectId } = router.query
	const [showProjectModal, setShowProjectModal] = useState(false)
	const [projectUpdatedEvent, setProjectUpdatedEvent] = useState(false)
	const {
		data: myProject,
		mutate: fetchMyProject,
		isValidating: isLoadingMyProject,
	} = useSWR(['/api/my/project', { projectId }], fetcher, { revalidateOnFocus: false })

	const handleSaveProject = () => {
		setShowProjectModal(false)
		fetchMyProject()
	}

	return (
		<>
			<Head>
				<title>Проект {myProject?.Name}</title>
			</Head>
			<Row justify="space-between" align="top">
				<Col xs={{ span: 24 }} md={{ span: 12 }}>
					<h1>{myProject?.Name}</h1>
				</Col>
				<Col xs={{ span: 24 }} md={{ span: 12 }}>
					<Space wrap>
						{myProject?.Status !== 'Closed' && (
							<Button
								onClick={() => setShowProjectModal(true)}
								icon={<TbSettings size={16} style={{ position: 'relative', top: '3px', marginRight: '6px' }} />}
							>
								Внести изменения
							</Button>
						)}
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

			<MyProjectTeam project={myProject} shouldUpdate={projectUpdatedEvent} />
			<MyProjectVacancies project={myProject} />
			<MyProjectCandidates project={myProject} onUpdate={() => setProjectUpdatedEvent(!projectUpdatedEvent)} />

			<ProjectIdeaModal
				seasonId={myProject?.Season[0]}
				projectIdeaId={projectId}
				open={showProjectModal}
				onOk={handleSaveProject}
				onCancel={() => setShowProjectModal(false)}
			/>
		</>
	)
}

MyProjectPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
	const session: any = await unstable_getServerSession(context.req, context.res, authOptions)

	if (session && !session.user.hasRole('member')) {
		return {
			notFound: true,
		}
	}

	return { props: {} }
}

export default MyProjectPage
