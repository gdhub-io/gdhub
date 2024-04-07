import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { User } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Card, Col, Descriptions, Grid, Row, Space, Spin, Typography } from 'antd'
import axios from 'axios'
import styles from './style.module.scss'

const { Paragraph } = Typography

const MentorsPage: NextPageWithLayout = () => {
	const { t } = useTolgee()
	const screens = Grid.useBreakpoint()

	const { data: mentors, isSuccess, isLoading } = useQuery(['mentors'], () => axios.get('/api/mentors'))

	return (
		<ProtectedLayout title={t('Mentors')}>
			<Space direction="vertical" size="large">
				<p>
					<T keyName="hub.mentors.description">
						Gaming industry experts who are ready to help you find solutions to the issues you encounter in game
						development
					</T>
				</p>
			</Space>

			<Spin spinning={isLoading}>
				<Row
					gutter={[
						{ md: 24, xs: 24 },
						{ md: 24, xs: 24 },
					]}
				>
					{!isSuccess && <Paragraph type="secondary">There are no mentors available to view</Paragraph>}
					{mentors?.data?.map((mentor: User & { profile: any; specialities: any[] }, idx: number) => (
						<Col key={idx} xs={{ span: 24 }} md={{ span: 12 }} lg={{ span: 8 }} xl={{ span: 6 }}>
							<Card
								className={styles.card}
								cover={
									mentor.image ? (
										<div className={styles.cover} style={{ backgroundImage: `url(${mentor.image})` }}></div>
									) : null
								}
							>
								<Card.Meta
									title={mentor.profile.name}
									description={
										<div className={styles.mentorDescriptions}>
											<Descriptions layout={screens.md ? 'horizontal' : 'vertical'} column={1}>
												<Descriptions.Item label={t('Specilaity')}>{mentor.specialities[0].name}</Descriptions.Item>
												<Descriptions.Item label={t('Direction')}>
													{mentor.specialities[0].direction.name}
												</Descriptions.Item>
												<Descriptions.Item label={t('Language')}>{mentor.lang}</Descriptions.Item>
											</Descriptions>

											<Paragraph>{mentor.specialities[0].summary}</Paragraph>

											<Button type="primary" style={{ width: '100%', marginTop: '10px' }}>
												<T>Schedule a meeting</T>
											</Button>
										</div>
									}
								/>
							</Card>
						</Col>
					))}
				</Row>
			</Spin>
		</ProtectedLayout>
	)
}

export default MentorsPage
