import DividerIcon from '@/assets/images/icons/divider.svg'
import { Alert, Card, Descriptions, Grid, Space, Spin, Tag, Typography } from 'antd'
import axios from 'axios'
import Link from 'next/link'
import { useQuery } from 'react-query'
import styles from './style.module.scss'

const { Title, Text, Paragraph } = Typography

const SeasonsList = () => {
	const screens = Grid.useBreakpoint()
	const { data: seasons, isFetching: isLoading } = useQuery('seasons', () => axios.get<any[]>('/api/seasons'), {
		staleTime: Infinity,
	})

	const isCompletedSeason = (season: any) => {
		return !season.isActive
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
			<Spin spinning={isLoading}>
				<Space direction="vertical" size={24} style={{ width: '100%' }}>
					{!seasons?.data.length && !isLoading && (
						<Alert
							description={
								<Text>
									На данный момент нет активных запусков инкубационной программы Gamelab. Следите за анонсами будущих
									запусков в наших чатах и социальных сетях. Вы также можете инициировать старт своего проекта вне
									данной программы заполнив{' '}
									<Link href="https://tally.so/r/w8zl5P" target="_blank">
										данную форму
									</Link>
								</Text>
							}
						/>
					)}
					{!!seasons?.data &&
						seasons.data.map((season: any, idx: number) => (
							<Link href={`/${season.slug}`} key={`gamelab-season-${idx}`}>
								<Card
									className={`${styles.seasonContainer} ${isActiveSeason(season) ? styles.seasonActive : ''}`}
									style={
										season.currentStageName == 'Searching' || season.currentStageName == 'Pitching'
											? { borderColor: '#333', borderWidth: '2px' }
											: undefined
									}
									title={
										<Space align="start" direction={screens.md ? 'horizontal' : 'vertical'} size={0}>
											<div className="title">{season.name}</div>
											{!isCompletedSeason(season) && (
												<>
													{screens.md && <DividerIcon className="divider" />}
													<small>Этап {stagesDetails(season.currentStageName)?.number}-ый из 6</small>
													{screens.md && <DividerIcon className="divider" />}
													<small>{stagesDetails(season.currentStageName)?.title}</small>
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
