import { useMemo, useState } from 'react'
import { capitalize } from '@/helpers/text'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { GoArrowLeft } from '@react-icons/all-files/go/GoArrowLeft'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Alert, Button, Checkbox, Col, Flex, Grid, Popover, Row, Space, Steps, Typography } from 'antd'
import axios from 'axios'
import { Dayjs } from 'dayjs'
import styles from './style.module.scss'
import WorkflowStepContent from './WorkflowStepContent'

const { Title, Text, Paragraph } = Typography

export type ProjectWorkflow = prismaClient.ProjectWorkflow & { steps: prismaClient.ProjectWorkflowStep[] }

const WorkflowContent = ({ projectId, locale = 'en' }: { projectId: string; locale?: string }) => {
	const screens = Grid.useBreakpoint()
	const [conditionStatus, setConditionStatus] = useState<any>({ completed: false })
	const [step, setStep] = useState<prismaClient.ProjectWorkflowStep & { tasks: prismaClient.ProjectWorkflowTask[] }>()
	const [workflow, setWorkflow] = useState<ProjectWorkflow>()
	const { t } = useTolgee()

	const { refetch: refetchWorkflowData } = useQuery(
		['project-workflow', projectId],
		() =>
			axios.get<{
				currentStep: prismaClient.ProjectWorkflowStep & { tasks: prismaClient.ProjectWorkflowTask[] }
				workflow: ProjectWorkflow
			}>('/api/user/project/workflow', {
				params: { projectId },
			}),
		{
			enabled: !!projectId,
			onSuccess({ data }) {
				setStep(data.currentStep)
				setWorkflow(data.workflow)
				// setConditionStatus(data.conditionStatus)
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
		return workflow?.steps.findIndex((s) => s.id == step?.id) || 0
	}, [workflow, step])

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

	const handlePreviousStage = () => {
		if (!workflow?.steps) return

		const nextStageId = currentStageIndex > 0 ? currentStageIndex - 1 : currentStageIndex

		moveProjectToStage({ projectId, targetStageId: workflow.steps[nextStageId]?.id })
	}

	const handleNextStage = () => {
		if (!workflow?.steps) return

		const previousStageId = currentStageIndex < workflow.steps.length ? currentStageIndex + 1 : currentStageIndex

		moveProjectToStage({ projectId, targetStageId: workflow.steps[previousStageId]?.id })
	}

	// const handleSetStage = (current: number) => {
	// 	if (!workflow?.stages) return

	// 	moveProjectToStage({ projectId, targetStageId: workflow.stages[current]?.id })
	// }

	if (!workflow || !step) return null

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
								{capitalize(t(`workflow.${workflow.title}.step${currentStageIndex + 1}.name`, step.name))}
							</Title>
							<Space>
								{currentStageIndex > 0 && (
									<Button onClick={handlePreviousStage} disabled={isMoving} icon={<GoArrowLeft />} type="text">
										<T keyName="workflow.previous-stage">Previous</T>
									</Button>
								)}
								{currentStageIndex < workflow.steps.length - 1 && (
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
							<div className={styles.stepContent}>
								<WorkflowStepContent step={step} locale={locale} />
							</div>

							{!!step.tasks && (
								<div className={styles.stepContent}>
									<Title level={2}>
										<T keyName="workflow.required-acitons.title">Required Actions</T>
									</Title>

									{Array.isArray(step.tasks) && step.tasks.length > 0 && (
										<Checkbox.Group
											style={{ flexDirection: 'column' }}
											options={step.tasks.map((task: any) => ({
												label: t(`workflow.${workflow.title}.condition.${task.label}`, task.label),
												value: task.field,
											}))}
											value={step.tasks.map((task: any) => task.field)}
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
								items={workflow.steps.map((s, idx: number) => ({
									title: capitalize(t(`workflow.${workflow.title}.step${idx + 1}.name`, s.name)),
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
