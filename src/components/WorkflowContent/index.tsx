import { useState } from 'react'
import DividerIcon from '@/assets/images/icons/divider.svg'
import SearchingStageContent from '@/components/WorkflowContent/stages/SearchingStageContent'
import { DefaultSeasonStages } from '@/types/enums'
import { Season, SeasonStage, SeasonStatus } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Grid, Space, Typography } from 'antd'
import axios from 'axios'
import dayjs, { Dayjs } from 'dayjs'
import DoneStageContent from './stages/DoneStageContent'
import PitchingStageContent from './stages/PitchingStageContent'
import PreProductionStageContent from './stages/PreProductionStageContent'
import ProductionStageContent from './stages/ProductionStageContent'
import PrototypingStageContent from './stages/PrototypingStageContent'
import RecruitingStageContent from './stages/RecruitingStageContent'
import styles from './style.module.scss'

export type SeasonData = Season & { stages: SeasonStage[] }

const { Title, Text, Paragraph } = Typography

const WorkflowContent = ({ projectId }: { projectId: string }) => {
	const screens = Grid.useBreakpoint()
	const [stage, setStage] = useState<SeasonStage>()
	const [workflow, setWorkflow] = useState<SeasonData>()
	const { t } = useTolgee()

	const { isLoading } = useQuery(
		['project-workflow', projectId],
		() =>
			axios.get<SeasonStage & { season: SeasonData }>('/api/user/project/workflow', {
				params: { projectId },
			}),
		{
			enabled: !!projectId,
			onSuccess({ data }) {
				setStage(data)
				setWorkflow(data.season)
			},
		}
	)

	// const finishedAt = useMemo(() => {
	// 	if (!season || !season.finishedAt) return

	// 	return dayjs(season.finishedAt)
	// }, [season])

	// const startedAt = useMemo(() => {
	// 	if (!season || !season.startedAt) return

	// 	return dayjs(season.startedAt)
	// }, [season])

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
		if (!workflow) return

		if (workflow.status === SeasonStatus.Done) {
			return <DoneStageContent season={workflow} />
		}

		switch (stageName) {
			case DefaultSeasonStages.Pitching:
				return <PitchingStageContent season={workflow} />
			case DefaultSeasonStages.Searching:
				return <SearchingStageContent season={workflow} />
			case DefaultSeasonStages.PreProduction:
				return <PreProductionStageContent season={workflow} />
			case DefaultSeasonStages.Prototyping:
				return <PrototypingStageContent season={workflow} />
			case DefaultSeasonStages.Recruiting:
				return <RecruitingStageContent season={workflow} />
			case DefaultSeasonStages.Production:
				return <ProductionStageContent season={workflow} />
			case DefaultSeasonStages.Done:
				return <DoneStageContent season={workflow} />
			default:
				return (
					<Text>
						<T>There is no information on the current stage or is still preparing.</T>
					</Text>
				)
		}
	}

	if (!workflow) return null

	return (
		<div className={styles.container}>
			<Space align="baseline">
				<Title level={2}>{workflow.name}</Title>
				{workflow.status !== SeasonStatus.Done && !!stage && (
					<Text type="secondary">
						<T>Stage</T> {stage.order + 1}
						<T>th from</T> 6
					</Text>
				)}
			</Space>

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

export default WorkflowContent
