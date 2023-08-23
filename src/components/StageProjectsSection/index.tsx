import { Project, ProjectStatus, User } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { Col, Card, Descriptions, Typography, Button, Row, Grid } from 'antd'
import axios from 'axios'
import Image from 'next/image'
import Link from 'next/link'
import styles from './style.module.scss'

type ProjectsSectionArgs = {
	stageId: string
	status?: ProjectStatus
}

export const StageProjectsSection = ({ stageId, status = ProjectStatus.Registered }: ProjectsSectionArgs) => {
	const screens = Grid.useBreakpoint()

	const { data: projects, isFetching: isLoadingProjecIdeas } = useQuery(['projects', stageId], () =>
		axios.get<(Project & { author: User })[]>('/api/season/stage/projects', {
			params: { stageId, status },
		})
	)

	if (!projects?.data.length) {
		return <p>No project yet.</p>
	}

	return projects.data.map((project, idx: number) => (
		<Row
			key={'season-project-' + idx}
			gutter={[
				{ md: 24, xs: 24 },
				{ md: 24, xs: 24 },
			]}
		>
			<Col key={idx} xs={{ span: 24 }} md={{ span: 12 }} lg={{ span: 8 }} xl={{ span: 6 }}>
				<Card
					className={styles.card}
					cover={project.coverImage ? <Image alt="cover" src={project.coverImage} fill /> : null}
				>
					<Card.Meta
						description={
							<div className={styles.projectDescriptions}>
								<Descriptions title={project.name} layout={screens.md ? 'horizontal' : 'vertical'} column={1}>
									<Descriptions.Item>
										<Typography.Paragraph ellipsis={{ rows: 4 }}>{project.description}</Typography.Paragraph>
									</Descriptions.Item>
									<Descriptions.Item label="Автор">{project.author.name} </Descriptions.Item>
									<Descriptions.Item label="Жанр">{project.genre}</Descriptions.Item>
									<Descriptions.Item label="Сеттинг">{project.setting}</Descriptions.Item>
									<Descriptions.Item label="Платформа">{project.platform}</Descriptions.Item>
								</Descriptions>
								<Descriptions layout="vertical" column={1}>
									<Descriptions.Item label="Визуальный стиль">{project.visualStyle}</Descriptions.Item>
								</Descriptions>
								<Link href={`/project/${project.slug}`} target="_blank">
									<Button type="primary" style={{ width: '100%', marginTop: '10px' }}>
										На страницу проекта
									</Button>
								</Link>
							</div>
						}
					/>
				</Card>
			</Col>
		</Row>
	))
}
