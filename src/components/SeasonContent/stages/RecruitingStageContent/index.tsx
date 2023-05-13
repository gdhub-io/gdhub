import { useState } from 'react'
import { fetcher } from '@helpers/fetcher'
import { Button, Card, Col, Descriptions, Grid, message, Row, Spin, Typography } from 'antd'
import Image from 'next/image'
import Link from 'next/link'
import useSWR from 'swr'
import styles from './style.module.scss'

const RecruitingStageContent = ({ season, stage }: any) => {
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

	const handleDeleteIdea = async (projectIdeaId: string) => {
		try {
			const response = await fetch('/api/project/idea/delete', {
				method: 'post',
				body: JSON.stringify({ projectIdeaId }),
				headers: {
					'Content-Type': 'application/json',
				},
			})

			if (!response.ok) throw new Error()

			await mutateProjects()
			message.success('Идея проекта была удалена')
		} catch (error: any) {
			message.error('Error')
		}
	}

	const handleSaveProjectIdea = async () => {
		setShowProjectIdeaModal(false)
		await mutateProjects()
	}

	return (
		<div className={styles.container}>
			<Spin spinning={!season}>
				<p>
					Проекты проработаны, пора формировать команды. Для этого каждый участник Геймхаба может изучить доступные
					проекты, вакансии и оставить заявку на участие. Специалисты, которые заинтересуют лидеров команд (авторов
					проектов), получат от них приглашение на собеседование.
				</p>
				<p>
					Полезный материал:{' '}
					<Link className="text-link" href="/hub/docs/about-recruiting" target="_blank">
						Как попасть на проект
					</Link>
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

export default RecruitingStageContent
