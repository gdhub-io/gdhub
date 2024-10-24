import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Card, Col, Descriptions, Grid, Row, Spin, Typography } from 'antd'
import axios from 'axios'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import styles from './style.module.scss'

const { Title, Paragraph } = Typography

type ProjectIncludeAll = prismaClient.Project & {
	author: prismaClient.User
	stage: prismaClient.SeasonStage & { season: prismaClient.Season }
}

const ProjectsPage: NextPageWithLayout = () => {
	const { t } = useTolgee()
	const screens = Grid.useBreakpoint()
	const { data: session } = useSession()

	const {
		data: projects,
		isSuccess,
		isLoading,
	} = useQuery(['projects'], () => axios.get('/api/projects'), { enabled: !!session?.user })

	// const breadcrumbItems = (project: ProjectIncludeAll): ItemType[] => [
	// 	{
	// 		title: project.stage.season.name,
	// 		key: project.stage.season.name + '-season',
	// 	},
	// 	{
	// 		title: project.stage.name,
	// 		key: project.stage.name + '-stage',
	// 	},
	// ]

	return (
		<ProtectedLayout
			title={t('page.hab.projects.title', 'Indie Game Projects')}
			subTitle={t('page.hab.projects.subtitle', 'Projects developed independently by users')}
		>
			<div className={styles.container}>
				<Spin spinning={isLoading}>
					<Row
						gutter={[
							{ md: 24, xs: 24 },
							{ md: 24, xs: 24 },
						]}
					>
						{!isSuccess && <Paragraph type="secondary">There are no projects available to view</Paragraph>}
						{projects?.data?.map((project: ProjectIncludeAll, idx: number) => (
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
															{/* <Breadcrumb items={breadcrumbItems(project)} className={styles.seasonDetails} /> */}
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
													<Descriptions.Item label={t('Game Setting')}>{project.setting}</Descriptions.Item>
													<Descriptions.Item label={t('Platform')}>{project.platform}</Descriptions.Item>
												</Descriptions>
												<Link href={`/project/${project.slug}`} title={project.name}>
													<Button type="primary" style={{ width: '100%', marginTop: '10px' }}>
														<T>To the project page</T>
													</Button>
												</Link>
											</div>
										}
									/>
								</Card>
							</Col>
						))}
					</Row>
				</Spin>
			</div>
		</ProtectedLayout>
	)
}

export default ProjectsPage
