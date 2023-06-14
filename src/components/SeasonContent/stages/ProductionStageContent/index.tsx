import { useState } from 'react'
import { Button, Card, Col, Descriptions, Grid, Row, Space, Spin, Typography } from 'antd'
import moment from 'moment-timezone'
import Image from 'next/image'
import Link from 'next/link'
import useSWR from 'swr'
import styles from './style.module.scss'
import { fetcher } from '@/helpers/fetcher'

const ProductionStageContent = ({ season, stage }: any) => {
	const screens = Grid.useBreakpoint()
	const [showProjectIdeaModal, setShowProjectIdeaModal] = useState(false)
	const [selectedProjectIdea, setSelectedProjectIdea] = useState<any>(null)
	const {
		data: projects,
		mutate: mutateProjects,
		isValidating: isLoadingProjecIdeas,
	} = useSWR({ url: '/api/season/ideas', data: { seasonName: season.Name } }, fetcher)
	const { data: reportsDates } = useSWR(
		{ url: '/api/season/reports-dates', data: { seasonName: season.Name, stage: stage.Name } },
		fetcher
	)

	const handleEditIdeaClick = (projectIdeaId: string) => {
		setSelectedProjectIdea(projectIdeaId)
		setShowProjectIdeaModal(true)
	}

	return (
		<div className={styles.container}>
			<Spin spinning={!season}>
				<p>
					Проекты находятся на основном этапе разработки. Команды сформированы и показали, что могут выдвать результат.
					Авторы проектов поняли какие ресурсы у них есть и что они смогут реализовать за оставшиеся 2 месяца. Прототипы
					и наброски визуала практически есть. Наращиваем темпы и выдаем крутой результат!
				</p>
				<p>
					Продолжаем следить за проектами через их онлайн-отчеты. Информация о видеоотчетах будет публиковаться в чате
					сообщества.
					<ul>
						{reportsDates?.map((reportDate: any) => (
							<li key={`report-date-${reportDate.Date}`}>
								{moment(reportDate.Date).tz(moment.tz.guess()).format('LLL')}
								<Typography.Text type="secondary">
									<small>{' ' + moment(reportDate.Date).tz(moment.tz.guess()).format('z')}</small>
								</Typography.Text>
							</li>
						))}
					</ul>
				</p>
				<p>
					Полезный материал: <br />
					<Space wrap direction="vertical">
						<Link className="text-link" href="https://www.youtube.com/watch?v=mnkf-u0Fkws" target="_blank">
							Арт-дирекшн от А до Я
						</Link>
						<Link className="text-link" href="https://www.youtube.com/watch?v=Jht-a_ZuOfA" target="_blank">
							Мобильный арт. Пайплайн создания графики для игр
						</Link>
						<Link className="text-link" href="https://www.youtube.com/watch?v=Ax7Vn4KlgcM" target="_blank">
							Простые шаги для сочной игры
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

export default ProductionStageContent
