import { useMemo } from 'react'
import DividerIcon from '@/assets/images/icons/divider.svg'
import SearchingStageContent from '@/components/SeasonContent/stages/SearchingStageContent'
import { DefaultSeasonStages } from '@/types/enums'
import { Season, SeasonStage, SeasonStatus } from '@prisma/client'
import { Grid, Space, Typography } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import DoneStageContent from './stages/DoneStageContent'
import PitchingStageContent from './stages/PitchingStageContent'
import PreProductionStageContent from './stages/PreProductionStageContent'
import ProductionStageContent from './stages/ProductionStageContent'
import PrototypingStageContent from './stages/PrototypingStageContent'
import RecruitingStageContent from './stages/RecruitingStageContent'
import styles from './style.module.scss'

export type SeasonData = Season & { stages: (SeasonStage & { isCompleted: boolean })[] }

const { Title, Text, Paragraph } = Typography

const SeasonContent = ({ season }: { season: SeasonData }) => {
	const screens = Grid.useBreakpoint()
	const stage = useMemo(() => {
		console.log('stage', season?.stages)
		return season?.stages.find((s) => s.isCurrent)
	}, [season])

	const finishedAt = useMemo(() => {
		if (!season || !season.finishedAt) return

		return dayjs(season.finishedAt)
	}, [season])

	const startedAt = useMemo(() => {
		if (!season || !season.startedAt) return

		return dayjs(season.startedAt)
	}, [season])

	const datePeiodtoText = ({ start, finish }: { start?: Dayjs; finish?: Dayjs }) => {
		if (!start) return

		if (finish && start.year() === finish.year()) {
			return start.format('D MMM') + ' - ' + finish.format('ll')
		}

		if (finish && start.year() != finish.year()) {
			return start.format('ll') + ' - ' + finish.format('ll')
		}

		return 'c ' + start.format('ll')
	}

	const stageContent = (stageName: string) => {
		if (season.status === SeasonStatus.Done) {
			return <DoneStageContent season={season} />
		}

		switch (stageName) {
			case DefaultSeasonStages.Pitching:
				return <PitchingStageContent season={season} />
			case DefaultSeasonStages.Searching:
				return <SearchingStageContent season={season} />
			case DefaultSeasonStages.PreProduction:
				return <PreProductionStageContent season={season} />
			case DefaultSeasonStages.Prototyping:
				return <PrototypingStageContent season={season} />
			case DefaultSeasonStages.Recruiting:
				return <RecruitingStageContent season={season} />
			case DefaultSeasonStages.Production:
				return <ProductionStageContent season={season} />
			case DefaultSeasonStages.Done:
				return <DoneStageContent season={season} />
			default:
				return <Text>Информации по текущему этапу нет или еще готовится.</Text>
		}
	}

	if (!season) return null

	return (
		<div className={styles.container}>
			<Space align="baseline">
				<Title level={2}>{season.name}</Title>
				{season.status !== SeasonStatus.Done && !!stage && <Text type="secondary">Этап {stage.order + 1}-ый из 6</Text>}
			</Space>

			<Paragraph>Период проведения: {datePeiodtoText({ start: startedAt, finish: finishedAt })}</Paragraph>

			{!!stage && (
				<div>
					<Space align="center" direction={screens.md ? 'horizontal' : 'vertical'}>
						<Title level={4}>{stage.name}</Title>
						{!!stage.startedAt && (
							<Text>
								{screens.md && <DividerIcon style={{ stroke: 'gray' }} />}
								<Text type="secondary" style={{ marginBottom: 10, display: 'inline-block' }}>
									{datePeiodtoText({ start: dayjs(stage.startedAt), finish: dayjs(stage.finishedAt) })}
								</Text>
							</Text>
						)}
					</Space>

					<div>{stageContent(stage.name)}</div>
				</div>
			)}
		</div>
	)
}

export default SeasonContent
