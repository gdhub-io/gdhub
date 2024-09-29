import { useMemo, useState } from 'react'
import { capitalize } from '@/helpers/text'
import { Season, SeasonStage } from '@prisma/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Alert, Button, Checkbox, Col, Flex, Grid, Popover, Row, Space, Steps, Typography } from 'antd'
import axios from 'axios'
import { Dayjs } from 'dayjs'
import { GoArrowLeft } from 'react-icons/go'
import DefaultStageContent from './stages/DefaultStageContent'
import styles from './style.module.scss'

export type SeasonData = Season & { stages: SeasonStage[] }

const { Title, Text, Paragraph } = Typography

const WorkflowContent = ({ projectId, locale = 'en' }: { projectId: string; locale?: string }) => {
	const screens = Grid.useBreakpoint()
	const [conditionStatus, setConditionStatus] = useState<any>()
	const [stage, setStage] = useState<SeasonStage>()
	const [workflow, setWorkflow] = useState<SeasonData>()
	const { t } = useTolgee()

	const { refetch: refetchWorkflowData } = useQuery(
		['project-workflow', projectId],
		() =>
			axios.get<{
				conditionStatus: Record<string, any> & { completed: boolean }
				stage: SeasonStage & { season: SeasonData }
			}>('/api/user/project/workflow', {
				params: { projectId },
			}),
		{
			enabled: !!projectId,
			onSuccess({ data }) {
				setStage(data.stage)
				setWorkflow(data.stage.season)
				setConditionStatus(data.conditionStatus)
			},
		}
	)

	const { mutateAsync: moveProjectToStage, isLoading: isMoving } = useMutation(
		(data: any) => axios.put<void>(`/api/project/move`, data),
		{
			onSuccess: () => {
				refetchWorkflowData()
			},
		}
	)

	const currentStageIndex = useMemo(() => {
		return workflow?.stages.findIndex((s) => s.id == stage?.id) || 0
	}, [workflow, stage])

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
		if (!stage) return

		return <DefaultStageContent stage={stage} locale={locale} />

		// if (workflow.status === SeasonStatus.Done) {
		// 	return <DoneStageContent season={workflow} />
		// }

		// switch (stageName) {
		// 	case DefaultSeasonStages.Pitching:
		// 		return <PitchingStageContent season={workflow} />
		// 	case DefaultSeasonStages.Searching:
		// 		return <SearchingStageContent season={workflow} />
		// 	case DefaultSeasonStages.PreProduction:
		// 		return <PreProductionStageContent season={workflow} />
		// 	case DefaultSeasonStages.Prototyping:
		// 		return <PrototypingStageContent season={workflow} />
		// 	case DefaultSeasonStages.Recruiting:
		// 		return <RecruitingStageContent season={workflow} />
		// 	case DefaultSeasonStages.Production:
		// 		return <ProductionStageContent season={workflow} />
		// 	case DefaultSeasonStages.Done:
		// 		return <DoneStageContent season={workflow} />
		// 	default:
		// 		return (
		// 			<Text>
		// 				<T>There is no information on the current stage or is still preparing.</T>
		// 			</Text>
		// 		)
		// }
	}

	const handlePreviousStage = () => {
		if (!workflow?.stages) return

		const nextStageId = currentStageIndex > 0 ? currentStageIndex - 1 : currentStageIndex

		moveProjectToStage({ projectId, targetStageId: workflow.stages[nextStageId]?.id })
	}

	const handleNextStage = () => {
		if (!workflow?.stages) return

		const previousStageId = currentStageIndex < workflow.stages.length ? currentStageIndex + 1 : currentStageIndex

		moveProjectToStage({ projectId, targetStageId: workflow.stages[previousStageId]?.id })
	}

	// const handleSetStage = (current: number) => {
	// 	if (!workflow?.stages) return

	// 	moveProjectToStage({ projectId, targetStageId: workflow.stages[current]?.id })
	// }

	if (!workflow || !stage) return null

	return (
		<div className={styles.container}>
			<Space direction="vertical" style={{ width: '100%' }}>
				<Alert showIcon message="This section in development" />
				<br />

				<Row>
					<Col xs={24} lg={18}>
						<Flex justify="space-between" align="baseline">
							<Title level={2}>
								<T keyName="workflow.current-stage">Current stage</T>:{' '}
								{capitalize(t(`workflow.${workflow.name}.step${currentStageIndex + 1}.name`, stage.name))}
							</Title>
							<Space>
								{currentStageIndex > 0 && (
									<Button onClick={handlePreviousStage} disabled={isMoving} icon={<GoArrowLeft />} type="text">
										<T keyName="workflow.previous-stage">Previous</T>
									</Button>
								)}
								{currentStageIndex < workflow.stages.length - 1 && (
									<>
										{conditionStatus.completed == false ? (
											<Popover content={t('Required actions is not completed')}>
												<Button disabled={conditionStatus.completed == false}>
													<T keyName="workflow.next-stage">Next stage</T>
												</Button>
											</Popover>
										) : (
											<Button onClick={handleNextStage} disabled={isMoving}>
												<T keyName="workflow.next-stage">Next stage</T>
											</Button>
										)}
									</>
								)}
							</Space>
						</Flex>
					</Col>
					<Col xs={24} lg={6}></Col>
				</Row>

				<Row gutter={[32, 32]}>
					<Col xs={24} lg={18}>
						<Space direction="vertical" size={32} style={{ width: '100%' }}>
							<div className={styles.stageContent}>{stageContent(stage.name)}</div>

							{!!stage.conditions && (
								<div className={styles.stageContent}>
									<Title level={2}>
										<T keyName="workflow.required-acitons.title">Required Actions</T>
									</Title>

									{Array.isArray(stage.conditions) && stage.conditions.length > 0 && (
										<Checkbox.Group
											style={{ flexDirection: 'column' }}
											options={stage.conditions.map((condition: any) => ({
												label: t(`workflow.${workflow.name}.condition.${condition.label}`, condition.label),
												value: condition.field,
											}))}
											value={stage.conditions.map((condition: any) =>
												conditionStatus[condition.field] ? condition.field : null
											)}
										/>
									)}
								</div>
							)}
						</Space>
					</Col>
					{screens.lg && (
						<Col xs={24} lg={6}>
							<Steps
								direction="vertical"
								// onChange={handleSetStage}
								current={currentStageIndex}
								items={workflow.stages.map((s, idx: number) => ({
									title: capitalize(t(`workflow.${workflow.name}.step${idx + 1}.name`, s.name)),
									description: s.description,
								}))}
							/>
						</Col>
					)}
				</Row>
			</Space>
		</div>
	)
}

export default WorkflowContent
