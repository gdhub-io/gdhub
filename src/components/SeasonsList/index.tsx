import { Card, Descriptions, Grid, Space, Spin, Tag, Typography } from 'antd'
import Link from 'next/link'
import useSWR from 'swr'
import styles from './style.module.scss'
import DividerIcon from '@/assets/images/icons/divider.svg'
import { fetcher } from '@/helpers/fetcher'

const { Title } = Typography

const SeasonsList = () => {
	const screens = Grid.useBreakpoint()
	const { data } = useSWR({ url: '/api/seasons' }, fetcher, { revalidateOnFocus: false })

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
			<Title level={3}>Сезоны Gamelab</Title>
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
		</>
	)
}

export default SeasonsList
