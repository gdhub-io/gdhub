import { fetcher } from '@helpers/fetcher'
import { Button, Card, Col, Descriptions, Grid, Row, Spin, Typography } from 'antd'
import Image from 'next/image'
import Link from 'next/link'
import useSWR from 'swr'
import styles from './style.module.scss'

const DoneStageContent = ({ season }: any) => {
	const screens = Grid.useBreakpoint()
	const { data: projects } = useSWR({ url: '/api/season/ideas', data: { seasonName: season.Name } }, fetcher)

	return (
		<div className={styles.container}>
			<Spin spinning={!season}>
				<p>
					Данный сезон подошел к концу. Большое спасибо всем участникам.
					<br />
					Ниже можно посмотреть проекты, которые запустились в рамках текущго сезона. А также следите за обновлениями
					понравившихся проектов и инвестируйте в них ;)
				</p>

				<h3>Проекты</h3>
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

export default DoneStageContent
