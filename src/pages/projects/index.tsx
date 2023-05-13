import { ProtectedLayout } from '@layouts/ProtectedLayout'
import { getWorkedProjects } from '@services/airtable'
import { NextPageWithLayout } from 'pages/_app'
import { Breadcrumb, Button, Card, Col, Descriptions, Grid, Row } from 'antd'
import { GetServerSidePropsContext } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import styles from './style.module.scss'

const ProjectsPage: NextPageWithLayout = ({ projects }: any) => {
	const screens = Grid.useBreakpoint()

	return (
		<>
			<Head>
				<title>Проекты сообщества</title>
				<meta property="og:title" content="Проекты сообщества" />
				<meta property="og:type" content="website" />
				<meta property="og:url" content="/projects" />
			</Head>
			<div className={styles.container}>
				<h3>Проекты сообщества</h3>
				<Row
					gutter={[
						{ md: 24, xs: 24 },
						{ md: 24, xs: 24 },
					]}
				>
					{projects?.map((project: any, idx: number) => (
						<Col key={idx} xs={{ span: 24 }} md={{ span: 12 }} lg={{ span: 8 }} xl={{ span: 6 }}>
							<Card
								className={styles.card}
								cover={
									project['Cover Image'] ? (
										<Link href={`/project/${project.Slug}`}>
											<Image alt="cover" src={project['Cover Image']} fill />
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
														<Breadcrumb className={styles.seasonDetails}>
															<Breadcrumb.Item>Gamelab 11</Breadcrumb.Item>
															<Breadcrumb.Item>Production</Breadcrumb.Item>
														</Breadcrumb>
														<div>{project.Name}</div>
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
											<Link href={`/project/${project.Slug}`}>
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

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
	const projects = await getWorkedProjects()

	return {
		props: {
			projects,
		},
	}
}

ProjectsPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default ProjectsPage
