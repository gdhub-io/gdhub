import { useState } from 'react'
import { Button, Card, Col, Descriptions, Grid, Row, Space, Spin, Typography } from 'antd'
import Image from 'next/image'
import Link from 'next/link'
import useSWR from 'swr'
import styles from './style.module.scss'
import { fetcher } from '@/helpers/fetcher'

const PrototypingStageContent = ({ season, stage }: any) => {
	const screens = Grid.useBreakpoint()
	const [showProjectIdeaModal, setShowProjectIdeaModal] = useState(false)
	const [selectedProjectIdea, setSelectedProjectIdea] = useState<any>(null)
	const {
		data: projects,
		mutate: mutateProjects,
		isValidating: isLoadingProjecIdeas,
	} = useSWR({ url: '/api/season/ideas', data: { seasonName: season.Name } }, fetcher)

	const handleEditIdeaClick = (projectIdeaId: string) => {
		setSelectedProjectIdea(projectIdeaId)
		setShowProjectIdeaModal(true)
	}

	return (
		<div className={styles.container}>
			<Spin spinning={!season}>
				<p>
					Ура! У нас сформированы команды. Пора приступать к разработке игр. А именно начнем мы с разрабокти:
					<ul>
						<li>Прототипов игровых механик</li>
						<li>Поиска визуального решения для игры и отрисовка фейкового скриншота (фейкшота)</li>
					</ul>
				</p>
				<p>
					Так же на этом этапе команды начнут рассказывать о своем прогрессе в виде онлайн-отчетов. Информация о
					видеоотчетах будет публиковаться в чате сообщества.
					<ul>
						<li>Отчетный день 1: 15 февраля в 20:00 (по Минску)</li>
						<li>Отчетный день 2: 1 марта в 20:00 (по Минску)</li>
					</ul>
				</p>
				<p>
					Полезный материал:{' '}
					<Space wrap>
						<Link className="text-link" href="/hub/docs/prototyping-start" target="_blank">
							Разработка прототипа игры
						</Link>
						<Link className="text-link" href="/hub/docs/art-direction-start" target="_blank">
							Разработка визуального решения
						</Link>
						<Link className="text-link" href="/hub/docs/spring-reporting" target="_blank">
							Как готовиться к отчету
						</Link>
					</Space>
				</p>

				<h3>Проекты в разработке</h3>
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
								cover={project['Cover Image'] ? <Image alt="cover" src={project['Cover Image']} fill /> : null}
							>
								<Card.Meta
									description={
										<div className={styles.projectDescriptions}>
											<Descriptions title={project.Name} layout={screens.md ? 'horizontal' : 'vertical'} column={1}>
												<Descriptions.Item>
													<Typography.Paragraph ellipsis={{ rows: 4 }}>{project.Description}</Typography.Paragraph>
												</Descriptions.Item>
												<Descriptions.Item label="Автор">{project['Author Name']} </Descriptions.Item>
												<Descriptions.Item label="Жанр">{project.Genre}</Descriptions.Item>
												<Descriptions.Item label="Сеттинг">{project.Setting}</Descriptions.Item>
												<Descriptions.Item label="Платформа">{project.Platform}</Descriptions.Item>
											</Descriptions>
											<Descriptions layout="vertical" column={1}>
												<Descriptions.Item label="Визуальный стиль">{project['Visual Style']}</Descriptions.Item>
											</Descriptions>
											<Link href={`/project/${project.Slug}`} target="_blank">
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
			</Spin>
		</div>
	)
}

export default PrototypingStageContent
