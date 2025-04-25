import { PublicLayout } from '@/layouts/PublicLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { getWorkedProjects } from '@/services/prisma/queries'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { T, useTolgee } from '@tolgee/react'
import { Button, Card, Col, Descriptions, Grid, Row, Typography } from 'antd'
import { GetServerSidePropsContext } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import styles from './style.module.scss'

const { Title, Paragraph } = Typography

type ProjectIncludeAll = prismaClient.Project & {
	author: prismaClient.User
	currentStep: prismaClient.ProjectWorkflowStep & { workflow: prismaClient.ProjectWorkflow }
}
type ProjectsPageParams = { projects: ProjectIncludeAll[] }

const ProjectsPage: NextPageWithLayout<ProjectsPageParams> = ({ projects }) => {
	const { t } = useTolgee()
	const screens = Grid.useBreakpoint()
	const { data: session } = useSession()

	return (
		<PublicLayout
			title={t('page.projects.title', 'Indie Game Projects')}
			subTitle={t('page.projects.subtitle', 'Projects developed independently by users')}
			seo={{ description: t('Indie games that are developed by platform users') }}
		>
			<div className={styles.container}>
				<Row
					gutter={[
						{ md: 24, xs: 24 },
						{ md: 24, xs: 24 },
					]}
				>
					{!projects.length && <Paragraph type="secondary">There are no projects available to view</Paragraph>}
					{projects?.map((project: ProjectIncludeAll, idx: number) => (
						<Col key={idx} xs={{ span: 24 }} md={{ span: 12 }} lg={{ span: 8 }} xl={{ span: 6 }}>
							<Card
								className={styles.card}
								cover={
									project.coverImage ? (
										<Link href={`/project/${project.slug}`} title={project.name}>
											<Image title={project.name + ' cover'} alt="cover" src={project.coverImage} fill />
										</Link>
									) : null
								}
							>
								<Card.Meta
									description={
										<div className={styles.projectDescriptions}>
											<Descriptions
												title={
													<>
														<Title level={2} style={{ fontSize: 16 }}>
															{project.name}
														</Title>
													</>
												}
												layout={screens.md ? 'horizontal' : 'vertical'}
												column={1}
											>
												<Descriptions.Item label={t('Author')}>{project.author.name} </Descriptions.Item>
												<Descriptions.Item label={t('Genre')}>{project.genre}</Descriptions.Item>
												<Descriptions.Item label={t('Setting')}>{project.setting}</Descriptions.Item>
												<Descriptions.Item label={t('Platform')}>{project.platform}</Descriptions.Item>
											</Descriptions>
											<Link href={`/project/${project.slug}`} title={project.name}>
												<Button type="primary" style={{ width: '100%', marginTop: '10px' }}>
													<T>Go to project page</T>
												</Button>
											</Link>
										</div>
									}
								/>
							</Card>
						</Col>
					))}
				</Row>
			</div>
		</PublicLayout>
	)
}

export const getStaticProps = async (context: GetServerSidePropsContext) => {
	const projects = await getWorkedProjects()

	return {
		props: {
			projects: projects.map((p) => ({
				...p,
				createdAt: p.createdAt?.toISOString() || null,
				updatedAt: p.updatedAt?.toISOString() || null,
				startedAt: p.startedAt?.toISOString() || null,
				finishedAt: p.finishedAt?.toISOString() || null,
				lastPostAt: p.lastPostAt?.toISOString() || null,
				firstPostAt: p.firstPostAt?.toISOString() || null,
			})),
		},
		revalidate: 60,
	}
}

export default ProjectsPage
