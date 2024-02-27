import { useMemo } from 'react'
import DividerIcon from '@/assets/images/icons/divider.svg'
import { DefaultSeasonStages } from '@/types/enums'
import { SeasonStage } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Alert, Card, Descriptions, Grid, Space, Spin, Tag, Typography } from 'antd'
import axios from 'axios'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styles from './style.module.scss'

const { Title, Text, Paragraph } = Typography

type SeasonGeneralData = {
	name: string
	slug: string
	startedAt: string
	currentStage: SeasonStage & { isCompleted: boolean }
	projectsCount: number
	membersCount: number
	coverImage?: string
}

const SeasonsList = () => {
	const screens = Grid.useBreakpoint()
	const router = useRouter()
	const { t } = useTolgee()
	const { data: seasons, isFetching: isLoading } = useQuery(
		['seasons'],
		() => axios.get<SeasonGeneralData[]>('/api/seasons'),
		{
			refetchInterval: false,
		}
	)

	const isActiveSeason = (season: any) => {
		return season.status == 'Active'
	}

	const isPlannedSeason = (season: any) => {
		return season.currentStage.name == 'Planning'
	}

	const stagesDetails = (stageName: any) => {
		const details: any = {
			Searching: {
				number: 1,
				title: t('Study stage'),
			},
			'Pre-production': {
				number: 2,
				title: t('The stage of preparation of the project'),
			},
			Recruiting: {
				number: 3,
				title: t('The stage of the team set'),
			},
			Prototyping: {
				number: 4,
				title: t('Stage of prototyping'),
			},
			Production: {
				number: 5,
				title: t('Project development stage'),
			},
			Pitching: {
				number: 6,
				title: t('Pitches of projects'),
			},
			Planning: {
				title: t('Planned'),
			},
			Done: {
				title: t('Completed'),
			},
		}

		return details[stageName]
	}

	const actionTag = (season: any) =>
		!season.currentStage.isCompleted ? (
			<Tag color="success">
				<T>The current season</T>
			</Tag>
		) : (
			<Tag color="gray">
				<T>Completed</T>
			</Tag>
		)

	const linkToForm = useMemo(() => {
		let link = ''

		console.log('router.locale', router.locale)

		switch (router.locale) {
			case 'en':
				link = 'https://tally.so/r/w2NV6D'
				break
			case 'ru':
				link = 'https://tally.so/r/w8zl5P'
				break
		}

		return link
	}, [router])

	return (
		<>
			<Title level={3}>
				<T>IncubaMation program GameLab</T>
			</Title>
			<Paragraph>
				<T keyName="seasonsListDesc">
					Within the framework of this program, the authors of the IGR can submit their ideas, while other specialists
					can get to the commands Development and turn these ideas into a computer or mobile game.
				</T>
			</Paragraph>
			<Spin spinning={isLoading}>
				<Space direction="vertical" size={24} style={{ width: '100%' }}>
					{!seasons?.data.length && !isLoading && (
						<Alert
							description={
								<Text>
									<T keyName="seasonsListEmpty">
										At the moment, there are no active launches of the Gamelab incubation program.Follow the
										announcements of future launches in our chats and social networks.You can also initiate the start of
										your project outside filling
									</T>{' '}
									<Link href={linkToForm} target="_blank">
										<T>this form</T>
									</Link>
									.
								</Text>
							}
						/>
					)}
					{!!seasons?.data &&
						seasons.data.map((season, idx: number) => (
							<Link
								href={`/${season.slug}`}
								key={`gamelab-season-${idx}`}
								style={{
									pointerEvents: isPlannedSeason(season) ? 'none' : 'auto',
								}}
							>
								<Card
									className={`${styles.seasonContainer} ${isActiveSeason(season) ? styles.seasonActive : ''}`}
									cover={
										(isActiveSeason(season) || isPlannedSeason(season)) && season.coverImage ? (
											<div className={styles.gamelabCover}>
												<Image src={season.coverImage} alt="gamelab-banner" fill />
											</div>
										) : null
									}
									style={
										season.currentStage.name == DefaultSeasonStages.Searching ||
										season.currentStage.name == DefaultSeasonStages.Pitching
											? { borderColor: '#333', borderWidth: '2px' }
											: undefined
									}
									title={
										<Space align="start" direction={screens.md ? 'horizontal' : 'vertical'} size={0}>
											<div className="title">{season.name}</div>
											{!season.currentStage.isCompleted && (
												<>
													{screens.md && <DividerIcon className="divider" />}
													<small>
														<T>Stage</T> {stagesDetails(season.currentStage.name)?.number}
														<T>th of</T> 6
													</small>
													{screens.md && <DividerIcon className="divider" />}
													<small>{stagesDetails(season.currentStage.name)?.title}</small>
												</>
											)}

											{!screens.md && actionTag(season)}
										</Space>
									}
									extra={screens.md && actionTag(season)}
								>
									{season.currentStage.name === DefaultSeasonStages.Searching && (
										<Paragraph>
											<T>There is a set of projects.</T>{' '}
											<Link href={`/${season.slug}`}>
												<T>Details</T>
											</Link>
										</Paragraph>
									)}

									{season.currentStage.name !== DefaultSeasonStages.Searching && !isPlannedSeason(season) && (
										<Descriptions bordered column={1} size="small">
											<Descriptions.Item label={t('Participants')}>{season.membersCount}</Descriptions.Item>
											<Descriptions.Item label={t('Projects')}>{season.projectsCount}</Descriptions.Item>
										</Descriptions>
									)}
								</Card>
							</Link>
						))}
				</Space>
			</Spin>
		</>
	)
}

export default SeasonsList
