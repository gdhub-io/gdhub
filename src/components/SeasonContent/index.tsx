import { useMemo } from 'react'
import { Grid, Space, Typography } from 'antd'
import dayjs from 'dayjs'
import { DateTime } from 'luxon'
import { useRouter } from 'next/router'
import DoneStageContent from './stages/DoneStageContent'
import PitchingStageContent from './stages/PitchingStageContent'
import PreProductionStageContent from './stages/PreProductionStageContent'
import ProductionStageContent from './stages/ProductionStageContent'
import PrototypingStageContent from './stages/PrototypingStageContent'
import RecruitingStageContent from './stages/RecruitingStageContent'
import styles from './style.module.scss'
import DividerIcon from '@/assets/images/icons/divider.svg'
import SearchingStageContent from '@/components/SeasonContent/stages/SearchingStageContent'

const { Title, Text, Paragraph } = Typography

const SeasonContent = ({ season }: any) => {
	const screens = Grid.useBreakpoint()
	const router = useRouter()
	const stage = useMemo(() => {
		if (!season) return

		return season['Season Stages'].find((s: any) => s.Name == season.Stage)
	}, [season])

	const finishedAt = useMemo(() => {
		if (!season || !season['Finished At']) return

		return dayjs(season['Finished At'])
	}, [season])

	const startedAt = useMemo(() => {
		if (!season || !season['Started At']) return

		return dayjs(season['Started At'])
	}, [season])

	const peiodAsText = useMemo(() => {
		if (!startedAt) return

		if (finishedAt && startedAt.year() === finishedAt.year()) {
			return startedAt.format('D MMM') + ' - ' + finishedAt.format('D MMM, YYYY')
		}

		if (finishedAt && startedAt.year() != finishedAt.year()) {
			return startedAt.format('D MMM, YYYY') + ' - ' + finishedAt.format('D MMM, YYYY')
		}

		return 'c ' + startedAt.format('D MMM, YYYY')
	}, [startedAt, finishedAt])

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
				content: <PitchingStageContent season={season} stage={stage} />,
			},
			Planning: {
				title: 'Планируется',
			},
			Done: {
				title: 'Завершен',
				content: <DoneStageContent season={season} stage={stage} />,
			},
		}

		return details[stage.Name]
	}

	if (!season) return null

	return (
		<div className={styles.container}>
			<Space align="baseline">
				<Title level={2}>{season.Name}</Title>
				{season.Stage !== 'Done' && (
					<Text type="secondary">Этап {stagesDetails({ Name: season.Stage }, season)?.number}-ый из 6</Text>
				)}
			</Space>

			<Paragraph>Период проведения: {peiodAsText}</Paragraph>

			{!!stage && (
				<div>
					<Space align="center" direction={screens.md ? 'horizontal' : 'vertical'}>
						<Title level={4}>{stagesDetails(stage, season)?.title}</Title>
						{!!stage['Started At'] && (
							<Text>
								{screens.md && <DividerIcon style={{ stroke: 'gray' }} />}
								<Text type="secondary" style={{ marginBottom: 10, display: 'inline-block' }}>
									{DateTime.fromISO(stage['Started At']).toFormat('dd LLL', {
										locale: router.locale,
									}) +
										' - ' +
										DateTime.fromISO(stage['Finished At']).toFormat('dd LLL yyyy', {
											locale: router.locale,
										})}
								</Text>
							</Text>
						)}
					</Space>

					<div>
						{stagesDetails(stage, season)?.content || <Text>Информация по текущему этапу пока еще готовится.</Text>}
					</div>
				</div>
			)}
		</div>
	)
}

export default SeasonContent
