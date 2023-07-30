import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { getWorkedProjects } from '@/services/prisma/queries'
import { Breadcrumb, Button, Card, Col, Descriptions, Grid, Row, Typography } from 'antd'
import { ItemType } from 'antd/es/breadcrumb/Breadcrumb'
import { GetServerSidePropsContext } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import styles from './style.module.scss'

const { Title, Paragraph } = Typography

const ProjectsPage: NextPageWithLayout = ({ projects }: any) => {
	const screens = Grid.useBreakpoint()

	const breadcrumbItems = (project: any): ItemType[] => [
		{
			title: project['Season Name'],
			key: project.Name + '-season',
		},
		{
			title: project.Stage,
			key: project.Name + '-stage',
		},
	]

	return (
		<>
			<Head>
				<title>Проекты сообщества</title>
				<meta property="og:url" content="/projects" />
			</Head>
			<div className={styles.container}>
				<Title style={{ fontSize: 24 }}>Проекты сообщества</Title>
				<Row
					gutter={[
						{ md: 24, xs: 24 },
						{ md: 24, xs: 24 },
					]}
				>
					{!projects.length && <Paragraph type="secondary">There are no projects available to view</Paragraph>}
					{projects?.map((project: any, idx: number) => (
						<Col key={idx} xs={{ span: 24 }} md={{ span: 12 }} lg={{ span: 8 }} xl={{ span: 6 }}>
							<Card
								className={styles.card}
								cover={
									project['Cover Image'] ? (
										<Link href={`/project/${project.Slug}`} title={project.Name}>
											<Image title={project.Name + ' cover'} alt="cover" src={project['Cover Image']} fill />
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
														<Breadcrumb items={breadcrumbItems(project)} className={styles.seasonDetails} />
														<Title level={2} style={{ fontSize: 16 }}>
															{project.Name}
														</Title>
													</>
												}
												layout={screens.md ? 'horizontal' : 'vertical'}
												column={1}
											>
												<Descriptions.Item label="Автор">{project['Author Name']} </Descriptions.Item>
												<Descriptions.Item label="Жанр">{project.Genre}</Descriptions.Item>
												<Descriptions.Item label="Сеттинг">{project.Setting}</Descriptions.Item>
												<Descriptions.Item label="Платформа">{project.Platform}</Descriptions.Item>
											</Descriptions>
											<Link href={`/project/${project.Slug}`} title={project.Name}>
												<Button type="primary" style={{ width: '100%', marginTop: '10px' }}>
													На страницу проекта
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
		</>
	)
}

export const getStaticProps = async (context: GetServerSidePropsContext) => {
	const projects = await getWorkedProjects()

	return {
		props: {
			projects,
		},
		revalidate: 60,
	}
}

ProjectsPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default ProjectsPage
