import { MatchingSpecialistAndProject, Project, User } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Col, Card, Descriptions, Button, Row, Grid, Alert } from 'antd'
import axios from 'axios'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import styles from './style.module.scss'

type ProjectsSectionArgs = {
	seasonId?: string
	seasonSlug?: string
}

export const SeasonProjectsSection = ({ seasonId, seasonSlug }: ProjectsSectionArgs) => {
	const screens = Grid.useBreakpoint()
	const { data: session } = useSession()
	const { t } = useTolgee()

	const { data: projects, isFetching: isLoadingProjecs } = useQuery(
		['projects', seasonId],
		() =>
			axios.get<(Project & { availableSpecialists: MatchingSpecialistAndProject[]; author: User })[]>(
				'/api/season/projects',
				{
					params: { seasonId, seasonSlug },
				}
			),
		{ enabled: !!seasonId || !!seasonSlug }
	)

	if (!projects?.data.length) {
		return <p>No project yet.</p>
	}

	return (
		<Row
			gutter={[
				{ md: 24, xs: 24 },
				{ md: 24, xs: 24 },
			]}
		>
			{projects.data.map((project, idx: number) => (
				<Col key={idx} xs={{ span: 24 }} md={{ span: 12 }} lg={{ span: 8 }} xl={{ span: 6 }}>
					<Card
						className={styles.card}
						cover={project.coverImage ? <Image alt="cover" src={project.coverImage} fill /> : null}
					>
						<Card.Meta
							description={
								<div className={styles.projectDescriptions}>
									<Descriptions title={project.name} layout={screens.md ? 'horizontal' : 'vertical'} column={1}>
										<Descriptions.Item label={t('Author')}>{project.author.name} </Descriptions.Item>
										<Descriptions.Item label={t('Genre')}>{project.genre}</Descriptions.Item>
										<Descriptions.Item label={t('Game Setting')}>{project.setting}</Descriptions.Item>
										<Descriptions.Item label={t('Platform')}>{project.platform}</Descriptions.Item>
									</Descriptions>
									<Descriptions layout="vertical" column={1}>
										<Descriptions.Item label={t('Visual style')}>{project.visualStyle}</Descriptions.Item>
									</Descriptions>
									<Link href={`/project/${project.slug}`}>
										<Button type="primary" style={{ width: '100%', marginTop: '10px' }}>
											<T>On the page of the project</T>
										</Button>
									</Link>
									{!!project.availableSpecialists?.filter((as) => as.id == session?.user.id) && (
										<Alert
											showIcon
											type="success"
											message={`The project suits you ${project.availableSpecialists[0]?.avgScore}%`}
											style={{ marginTop: 16 }}
										/>
									)}
								</div>
							}
						/>
					</Card>
				</Col>
			))}
		</Row>
	)
}
