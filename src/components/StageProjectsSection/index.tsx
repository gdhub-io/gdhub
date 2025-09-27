import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useQuery } from '@tanstack/react-query'
import { useTranslate } from '@tolgee/react'
import { Col, Card, Descriptions, Typography, Button, Row, Grid, Space } from 'antd'
import axios from 'axios'
import Image from 'next/image'
import Link from 'next/link'
import styles from './style.module.scss'

type ProjectsSectionArgs = {
	stageId: string
	status?: prismaClient.ProjectStatus
}

const { Title } = Typography

export const StageProjectsSection = ({
	stageId,
	status = prismaClient.ProjectStatus.Registered,
}: ProjectsSectionArgs) => {
	const screens = Grid.useBreakpoint()
	const { t } = useTranslate()

	const { data: projects, isFetching: isLoadingProjecIdeas } = useQuery({
		queryKey: ['projects', stageId],
		queryFn: () =>
			axios.get<(prismaClient.Project & { author: prismaClient.User })[]>('/api/season/stage/projects', {
				params: { stageId, status },
			}),
	})

	if (!projects?.data.length) {
		return (
			<Space style={{ width: '100%', marginTop: 32 }} direction="vertical">
				<Title level={5}>{t('component.stageProjectsSection.projectListByStage', 'Project list by stage')}</Title>
				<p>{t('component.stageProjectsSection.noProjectsYet', 'No projects yet')}</p>
			</Space>
		)
	}

	return (
		<Space style={{ width: '100%', marginTop: 32 }} direction="vertical">
			<Title level={5}>{t('component.stageProjectsSection.projectListByStage', 'Project list by stage')}</Title>
			{projects.data.map((project, idx: number) => (
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
											<Descriptions.Item label={t('Author')}>{project.author.name} </Descriptions.Item>
											<Descriptions.Item label={t('Genre')}>{project.genre}</Descriptions.Item>
											<Descriptions.Item label={t('Game Setting')}>{project.setting}</Descriptions.Item>
											<Descriptions.Item label={t('Platform')}>{project.platform}</Descriptions.Item>
										</Descriptions>
										<Descriptions layout="vertical" column={1}>
											<Descriptions.Item label={t('Visual style')}>{project.visualStyle}</Descriptions.Item>
										</Descriptions>
										<Link href={`/project/${project.slug}`} target="_blank">
											<Button type="primary" style={{ width: '100%', marginTop: '10px' }}>
												{t('component.stageProjectsSection.onThePageOfTheProject', 'On the page of the project')}
											</Button>
										</Link>
									</div>
								}
							/>
						</Card>
					</Col>
				</Row>
			))}
		</Space>
	)
}
