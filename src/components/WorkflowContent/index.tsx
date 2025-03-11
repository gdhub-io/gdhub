import { useMemo, useState } from 'react'
import { capitalize } from '@/helpers/text'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { GoArrowLeft } from '@react-icons/all-files/go/GoArrowLeft'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Alert, Button, Col, Drawer, Flex, Grid, Popover, Row, Space, Steps, Typography } from 'antd'
import axios from 'axios'
import { Dayjs } from 'dayjs'
import styles from './style.module.scss'
import WorkflowStepContent from './WorkflowStepContent'
import WorkflowTaskCard from './WorkflowTaskCard'

const { Title, Text } = Typography

export type ProjectWorkflow = prismaClient.ProjectWorkflow & { steps: prismaClient.ProjectWorkflowStep[] }

type ProjctWorkflowWithSteps = ProjectWorkflow & {
	steps: (prismaClient.ProjectWorkflowStep & { tasks: prismaClient.ProjectWorkflowTask[] })[]
}

const WorkflowContent = ({ projectId, locale = 'en' }: { projectId: string; locale?: string }) => {
	const screens = Grid.useBreakpoint()
	const [conditionStatus, setConditionStatus] = useState<any>({ completed: false })
	const [step, setStep] = useState<prismaClient.ProjectWorkflowStep & { tasks: prismaClient.ProjectWorkflowTask[] }>()
	const [workflow, setWorkflow] = useState<ProjctWorkflowWithSteps>()
	const [drawerVisible, setDrawerVisible] = useState(false)
	const [popoverVisible, setPopoverVisible] = useState(false)
	const [taskStatuses, setTaskStatuses] = useState<Record<string, boolean>>({})
	const { t } = useTolgee()

	// const mockTasks: ExtendedTask[] = useMemo(
	// 	() => [
	// 		{
	// 			id: '1',
	// 			label: 'Complete project description',
	// 			field: 'description',
	// 			required: true,
	// 			completed: conditionStatus.completed,
	// 			stage: 'Co-Working',
	// 		},
	// 		{
	// 			id: '2',
	// 			label: 'Add project team members',
	// 			field: 'team',
	// 			required: false,
	// 			completed: taskStatuses['2'] || false,
	// 			stage: 'Research v2',
	// 		},
	// 		{
	// 			id: '3',
	// 			label: 'Set project timeline',
	// 			field: 'timeline',
	// 			required: true,
	// 			completed: taskStatuses['3'] || false,
	// 			stage: 'Co-Working',
	// 		},
	// 	],
	// 	[conditionStatus.completed, taskStatuses]
	// )

	const { refetch: refetchWorkflowData } = useQuery(
		['project-workflow', projectId],
		() =>
			axios.get<{
				currentStep: prismaClient.ProjectWorkflowStep & { tasks: prismaClient.ProjectWorkflowTask[] }
				workflow: ProjctWorkflowWithSteps
			}>('/api/user/project/workflow', {
				params: { projectId },
			}),
		{
			enabled: !!projectId,
			onSuccess({ data }) {
				setStep(data.currentStep)
				setWorkflow(data.workflow)
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

	const handleSetStage = (stepIndex: number) => {
		if (!workflow?.steps) return
		moveProjectToStage({ projectId, targetStageId: workflow.steps[stepIndex]?.id })
		setPopoverVisible(false)
		setDrawerVisible(false)
	}

	// Обработчик изменения статуса задачи
	const handleTaskStatusChange = (taskId: string, checked: boolean) => {
		// Обновляем conditionStatus для задачи с id=1
		if (taskId === '1') {
			setConditionStatus((prev: any) => ({ ...prev, completed: checked }))
		} else {
			// Для остальных задач обновляем статус в taskStatuses
			setTaskStatuses((prev) => ({ ...prev, [taskId]: checked }))
		}
	}

	const stepsStepsList = (
		<div className={styles.stepsWrapper}>
			<Steps
				direction="vertical"
				current={currentStageIndex}
				items={workflow?.steps.map((s, idx: number) => ({
					title: capitalize(t(`workflow.${workflow.title}.step${idx + 1}.name`, s.name)),
					disabled: true,
				}))}
			/>
		</div>
	)

	if (!workflow) return null

	return (
		<div className={styles.container}>
			<Space direction="vertical" style={{ width: '100%' }}>
				<Flex justify="space-between" align="center" className={styles.stepHeader}>
					<div className={styles.stepTitle}>
						<Text style={{ margin: 0 }}>
							<T keyName="workflow.current-step">Current step</T>
						</Text>
						<Title level={2} className={styles.stepName}>
							{capitalize(
								t(
									`workflow.${workflow.title}.step${currentStageIndex + 1}.name`,
									workflow.steps[currentStageIndex]?.name
								)
							)}
						</Title>
					</div>
					<div className={styles.stepTasks}>
						{currentStageIndex > 0 && (
							<Button onClick={handlePreviousStage} disabled={isMoving} icon={<GoArrowLeft />} type="text">
								<T keyName="workflow.previous-step">Previous</T>
							</Button>
						)}
						{!screens.lg && (
							<Button type="text" onClick={() => setDrawerVisible(true)}>
								<T keyName="workflow.all-steps">All steps</T>
							</Button>
						)}
						{screens.lg && (
							<Popover content={stepsStepsList} trigger="click" open={popoverVisible} onOpenChange={setPopoverVisible}>
								<Button type="text">
									<T keyName="workflow.all-steps">All steps</T>
								</Button>
							</Popover>
						)}
						{currentStageIndex < workflow.steps.length - 1 && (
							<>
								{conditionStatus.completed == false ? (
									<Popover content={t('Tasks are not completed')}>
										<Button disabled={conditionStatus.completed == false}>
											<T keyName="workflow.next-step">Next step</T>
										</Button>
									</Popover>
								) : (
									<Button onClick={handleNextStage} disabled={isMoving}>
										<T keyName="workflow.next-step">Next step</T>
									</Button>
								)}
							</>
						)}
					</div>
				</Flex>

				<Row gutter={[32, 32]}>
					<Col xs={24} lg={16}>
						<Space direction="vertical" size={32} style={{ width: '100%' }}>
							<div className={styles.stepContent}>
								<WorkflowStepContent step={workflow.steps[currentStageIndex]} locale={locale} />
							</div>

							{!screens.lg && workflow.steps[currentStageIndex].tasks.length > 0 && (
								<div className={styles.stepContent}>
									<Title level={3}>
										<T keyName="workflow.tasks.title">Tasks</T>
									</Title>
									<div className={styles.tasksContainer}>
										{workflow.steps[currentStageIndex].tasks.map((task) => (
											<WorkflowTaskCard
												key={task.id}
												id={task.id}
												label={task.description || ''}
												stage={''}
												required={task.required}
												completed={task.done}
												onStatusChange={handleTaskStatusChange}
											/>
										))}
									</div>
								</div>
							)}
						</Space>
					</Col>
					{screens.lg && (
						<Col xs={24} lg={8}>
							<div className={styles.sidebarContent}>
								<Title level={3}>
									<T keyName="workflow.tasks.title">Tasks</T>
								</Title>
								{workflow.steps[currentStageIndex].tasks.length > 0 ? (
									<div className={styles.tasksContainer}>
										{workflow.steps[currentStageIndex].tasks.map((task) => (
											<WorkflowTaskCard
												key={task.id}
												id={task.id}
												label={task.description || ''}
												stage={''}
												required={task.required}
												completed={task.done}
												onStatusChange={handleTaskStatusChange}
											/>
										))}
									</div>
								) : (
									<Text type="secondary">
										<T keyName="workflow.no-tasks">No tasks for this step</T>
									</Text>
								)}
							</div>
						</Col>
					)}
				</Row>
			</Space>

			<Drawer
				title={<T keyName="workflow.all-steps">All steps</T>}
				placement="right"
				onClose={() => setDrawerVisible(false)}
				open={drawerVisible}
				width={screens.sm ? 400 : '80%'}
			>
				{stepsStepsList}
			</Drawer>
		</div>
	)
}

export default WorkflowContent
