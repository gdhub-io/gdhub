import DividerIcon from '@assets/images/icons/divider.svg'
import SearchingStageContent from '@components/SeasonsList/stages/SearchingStageContent'
import { fetcher } from '@helpers/fetcher'
import { Card, Collapse, Grid, Space, Spin } from 'antd'
import { DateTime } from 'luxon'
import { useRouter } from 'next/router'
import useSWR from 'swr'
import PreProductionStageContent from './stages/PreProductionStageContent'
import ProductionStageContent from './stages/ProductionStageContent'
import PrototypingStageContent from './stages/PrototypingStageContent'
import RecruitingStageContent from './stages/RecruitingStageContent'
import styles from './style.module.less'

const SeasonsList = () => {
	const screens = Grid.useBreakpoint()
	const router = useRouter()
	const { data, error } = useSWR({ url: '/api/seasons' }, fetcher, { revalidateOnFocus: false })

	const isPassiveSeason = (season: any) => {
		return ['Planning', 'Done'].includes(season.Stage)
	}

	const isActiveSeason = (season: any) => {
		return !isPassiveSeason(season)
	}

	const stagesDetails = (stage: any, season?: any) => {
		const details: any = {
			Searching: {
				number: 1,
				title: 'Этап исследования',
				content: <SearchingStageContent season={season} stage={stage} />,
			},
			'Pre-production': {
				number: 2,
				title: 'Этап подготовки проекта',
				content: <PreProductionStageContent season={season} stage={stage} />,
			},
			Recruiting: {
				number: 3,
				title: 'Этап набора команды',
				content: <RecruitingStageContent season={season} stage={stage} />,
			},
			Prototyping: {
				number: 4,
				title: 'Этап прототипирования',
				content: <PrototypingStageContent season={season} stage={stage} />,
			},
			Production: {
				number: 5,
				title: 'Этап разработки проекта',
				content: <ProductionStageContent season={season} stage={stage} />,
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

		return details[stage.Name]
	}

	return (
		<Spin spinning={!data}>
			<div className={styles.container}>
				{data?.seasons?.map((season: any, idx: number) => (
					<Card
						className={`season-container ${isPassiveSeason(season) ? 'not-active' : ''}`}
						style={season.Stage == 'Searching' ? { borderColor: '#333', borderWidth: '2px' } : undefined}
						key={`gamelab-season-${idx}`}
						title={
							<Space align="center">
								<div className="title">{season.Name}</div>
								<DividerIcon className="divider" />
								<small>Этап {stagesDetails({ Name: season.Stage }, season)?.number}-ый из 6</small>
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
							<Collapse activeKey={[season.Stage]} onChange={() => {}} bordered={false}>
								{season['Season Stages']
									.filter((s: any) => ['Planning', 'Done'].includes(s.Name) === false && s.Name == season.Stage)
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
											{stagesDetails(stage, season)?.content || 'Информация по текущему этапу пока еще готовится.'}
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
