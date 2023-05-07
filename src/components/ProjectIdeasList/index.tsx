import { Card, Col, Descriptions, Grid, Row, Typography } from 'antd'
import Image from 'next/image'
import styles from './style.module.scss'

export const ProjectIdeasList = ({ projectIdeas }: any) => {
	const screens = Grid.useBreakpoint()

	return (
		<Row
			gutter={[
				{ md: 24, xs: 24 },
				{ md: 24, xs: 24 },
			]}
		>
			{projectIdeas?.map((project: any, idx: number) => (
				<Col key={idx} xs={{ span: 24 }} md={{ span: 12 }} lg={{ span: 8 }} xl={{ span: 6 }}>
					<Card
						className={styles.card}
						cover={
							project['Cover Image'] ? (
								<Image alt="cover" src={project['Cover Image']} fill />
							) : (
								<div className={styles.emptyCover}>No cover</div>
							)
						}
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
								</div>
							}
						/>
					</Card>
				</Col>
			))}
		</Row>
	)
}
