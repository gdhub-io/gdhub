import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useTolgee } from '@tolgee/react'
import { Card, Col, Descriptions, Grid, Row, Spin, Typography } from 'antd'
import Image from 'next/image'
import styles from './style.module.scss'

export const ProjectIdeasList = ({
	projectIdeas,
	isLoading = false,
}: {
	projectIdeas: prismaClient.Project[]
	isLoading: boolean
}) => {
	const screens = Grid.useBreakpoint()
	const { t } = useTolgee()

	if (!projectIdeas.length) return <p>No project ideas yet.</p>

	return (
		<Spin spinning={isLoading}>
			<Row
				gutter={[
					{ md: 24, xs: 24 },
					{ md: 24, xs: 24 },
				]}
			>
				{projectIdeas.map((project: any, idx: number) => (
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
											<Descriptions.Item label={t('Author')}>{project.author.name} </Descriptions.Item>
											<Descriptions.Item label={t('Genre')}>{project.genre}</Descriptions.Item>
											<Descriptions.Item label={t('Game Setting')}>{project.setting}</Descriptions.Item>
											<Descriptions.Item label={t('Platform')}>{project.platform}</Descriptions.Item>
										</Descriptions>
										<Descriptions layout="vertical" column={1}>
											<Descriptions.Item label={t('Visual Style')}>{project.visualStyle}</Descriptions.Item>
										</Descriptions>
									</div>
								}
							/>
						</Card>
					</Col>
				))}
			</Row>
		</Spin>
	)
}
