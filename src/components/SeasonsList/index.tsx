import DividerIcon from '@/assets/images/icons/divider.svg'
import { fetcher } from '@/helpers/fetcher'
import { Button, Card, Col, Descriptions, Grid, Row, Space, Spin, Tag, Typography } from 'antd'
import Image from 'next/image'
import Link from 'next/link'
import useSWR from 'swr'
import styles from './style.module.scss'

const { Title, Paragraph } = Typography

const SeasonsList = () => {
	const screens = Grid.useBreakpoint()
	const { data } = useSWR({ url: '/api/seasons' }, fetcher, { revalidateOnFocus: false })

	const { data: otherProjects, isValidating: isLoadingOtherProjecs } = useSWR(
		{ url: '/api/season/ideas', data: { seasonName: 'Indie' } },
		fetcher,
		{ revalidateOnFocus: false, refreshInterval: 0 }
	)

	const isCompletedSeason = (season: any) => {
		return season.Stage == 'Done'
	}

	const isActiveSeason = (season: any) => {
		return !isCompletedSeason(season)
	}

	const stagesDetails = (stageName: any) => {
		const details: any = {
			Searching: {
				number: 1,
				title: 'Этап исследования',
			},
			'Pre-production': {
				number: 2,
				title: 'Этап подготовки проекта',
			},
			Recruiting: {
				number: 3,
				title: 'Этап набора команды',
			},
			Prototyping: {
				number: 4,
				title: 'Этап прототипирования',
			},
			Production: {
				number: 5,
				title: 'Этап разработки проекта',
			},
			Pitching: {
				number: 6,
				title: 'Питчи проектов',
			},
			Planning: {
				title: 'Планируется',
			},
			Done: {
				title: 'Завершен',
			},
		}

		return details[stageName]
	}

	const actionTag = (season: any) =>
		!isCompletedSeason(season) ? <Tag color="success">Действующий сезон</Tag> : <Tag color="gray">Завершен</Tag>

	return (
		<>
			<Title level={3}>Инкубационная программа Gamelab</Title>
			<Paragraph>
				В рамках данной программы авторы инди-игр могут подать свои идеи, а другие специалисты могут попасть в команды
				разработки и превратить эти идеи в компьютерную или мобильную игру.
			</Paragraph>
			<Spin spinning={!data}>
				<Space direction="vertical" size={24} style={{ width: '100%' }}>
					{data?.seasons?.map((season: any, idx: number) => (
						<Link href={`/${season.Slug}`} key={`gamelab-season-${idx}`}>
							<Card
								className={`${styles.seasonContainer} ${isActiveSeason(season) ? styles.seasonActive : ''}`}
								style={
									season.Stage == 'Searching' || season.Stage == 'Pitching'
										? { borderColor: '#333', borderWidth: '2px' }
										: undefined
								}
								title={
									<Space align="start" direction={screens.md ? 'horizontal' : 'vertical'} size={0}>
										<div className="title">{season.Name}</div>
										{!isCompletedSeason(season) && (
											<>
												{screens.md && <DividerIcon className="divider" />}
												<small>Этап {stagesDetails(season.Stage)?.number}-ый из 6</small>
												{screens.md && <DividerIcon className="divider" />}
												<small>{stagesDetails(season.Stage)?.title}</small>
											</>
										)}

										{!screens.md && actionTag(season)}
									</Space>
								}
								extra={screens.md && actionTag(season)}
							>
								<Descriptions bordered column={1} size="small">
									<Descriptions.Item label="Участников">{season.membersCount}</Descriptions.Item>
									<Descriptions.Item label="Проектов">{season.projectsCount}</Descriptions.Item>
								</Descriptions>
							</Card>
						</Link>
					))}
				</Space>
			</Spin>

			<Title level={3} style={{ marginTop: 60 }}>
				Другие проекты
			</Title>
			<Paragraph>
				Проекты разрабатываемые участниками сообщества самостоятельно (вне инкубационной программы).
			</Paragraph>

			<Spin spinning={isLoadingOtherProjecs} style={{ minHeight: 60 }}>
				<Row
					gutter={[
						{ md: 24, xs: 24 },
						{ md: 24, xs: 24 },
					]}
				>
					{otherProjects?.map((otherProject: any, idx: number) => (
						<Col key={idx} xs={{ span: 24 }} md={{ span: 12 }} lg={{ span: 8 }} xl={{ span: 8 }}>
							<Card
								className={styles.card}
								cover={
									otherProject['Cover Image'] ? <Image alt="cover" src={otherProject['Cover Image']} fill /> : null
								}
							>
								<Card.Meta
									description={
										<div className={styles.projectDescriptions}>
											<Descriptions
												title={otherProject.Name}
												layout={screens.md ? 'horizontal' : 'vertical'}
												column={1}
											>
												<Descriptions.Item>
													<Typography.Paragraph ellipsis={{ rows: 4 }}>{otherProject.Description}</Typography.Paragraph>
												</Descriptions.Item>
												<Descriptions.Item label="Автор">{otherProject['Author Name']} </Descriptions.Item>
												<Descriptions.Item label="Жанр">{otherProject.Genre}</Descriptions.Item>
												<Descriptions.Item label="Сеттинг">{otherProject.Setting}</Descriptions.Item>
												<Descriptions.Item label="Платформа">{otherProject.Platform}</Descriptions.Item>
											</Descriptions>
											<Descriptions layout="vertical" column={1}>
												<Descriptions.Item label="Визуальный стиль">{otherProject['Visual Style']}</Descriptions.Item>
											</Descriptions>
											<Link href={`/project/${otherProject.Slug}`}>
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
		</>
	)
}

export default SeasonsList
