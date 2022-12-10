import DividerIcon from '@assets/images/icons/divider.svg'
import SearchingStageContent from '@components/SeasonsList/stages/SearchingStageContent'
import { Card, Collapse, Grid, Space, Spin } from 'antd'
import { DateTime } from 'luxon'
import { useRouter } from 'next/router'
import useSWR from 'swr'
import PreProductionStageContent from './stages/PreProductionStageContent'
import styles from './style.module.less'

const fetcher = (url: string) => fetch(url, { method: 'post' }).then((res) => res.json())

const SeasonsList = () => {
	const screens = Grid.useBreakpoint()
	const router = useRouter()
	const { data, error } = useSWR('/api/seasons', fetcher)

	const isPassiveSeason = (season: any) => {
		return ['Planning', 'Done'].includes(season.Stage)
	}

	const isActiveSeason = (season: any) => {
		return !isPassiveSeason(season)
	}

	const stagesDetails = (stage: any, season?: any) => {
		const details: any = {
			Searching: {
				title: 'Этап исследования',
				content: <SearchingStageContent season={season} stage={stage} />,
			},
			'Pre-production': {
				title: 'Этап подготовки проекта',
				content: <PreProductionStageContent season={season} stage={stage} />,
			},
			Recruiting: {
				title: 'Этап набора начальной команды',
			},
			Production: {
				title: 'Этап разработки проекта',
			},
			Pitching: {
				title: 'Питчи проектов',
			},
			Planning: {
				title: 'Планируется',
			},
			Done: {
				title: 'Завершен',
			},
		}

		return details[stage.Name]
	}

	return (
		<Spin spinning={!data}>
			<div className={styles.container}>
				{data?.seasons?.map((season: any, idx: number) => (
					<Card
						className={`season-container ${isPassiveSeason(season) ? 'not-active' : ''}`}
						key={`gamelab-season-${idx}`}
						title={
							<Space align="center">
								<div className="title">{season.Name}</div>
								{isPassiveSeason(season) && (
									<>
										<DividerIcon className="divider" />
										<span>{stagesDetails({ Name: season.Stage }, season)?.title}</span>
									</>
								)}
							</Space>
						}
					>
						{isActiveSeason(season) && (
							<Collapse defaultActiveKey={[season.Stage]} onChange={() => {}} bordered={false}>
								{season['Season Stages']
									.filter((s: any) => ['Planning', 'Done'].includes(s.Name) === false)
									.map((stage: any) => (
										<Collapse.Panel
											header={
												<Space align="center" direction={screens.md ? 'horizontal' : 'vertical'}>
													<strong>{stagesDetails(stage, season)?.title}</strong>
													{!!stage['Started At'] && (
														<>
															{screens.md && <DividerIcon className="divider" />}
															<span>
																{DateTime.fromISO(stage['Started At']).toFormat('dd LLL', {
																	locale: router.locale,
																}) +
																	' - ' +
																	DateTime.fromISO(stage['Finished At']).toFormat('dd LLL yyyy', {
																		locale: router.locale,
																	})}
															</span>
														</>
													)}
												</Space>
											}
											key={stage.Name}
											collapsible={stage.Status === 'Active' ? 'header' : 'disabled'}
										>
											{stagesDetails(stage, season)?.content || 'Подробностей нет'}
										</Collapse.Panel>
									))}
							</Collapse>
						)}
					</Card>
				))}
			</div>
		</Spin>
	)
}

export default SeasonsList
