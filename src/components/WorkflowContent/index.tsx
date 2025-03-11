import { useMemo, useState, useEffect } from 'react'
import { capitalize } from '@/helpers/text'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { GoArrowLeft } from '@react-icons/all-files/go/GoArrowLeft'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Alert, Button, Checkbox, Col, Drawer, Flex, Grid, Popover, Row, Space, Steps, Typography, Tag } from 'antd'
import axios from 'axios'
import { Dayjs } from 'dayjs'
import styles from './style.module.scss'
import WorkflowStepContent from './WorkflowStepContent'

const { Title, Text } = Typography

export type ProjectWorkflow = prismaClient.ProjectWorkflow & { steps: prismaClient.ProjectWorkflowStep[] }

// Расширенный тип задачи с дополнительными свойствами
type ExtendedTask = {
	id: string
	label: string
	field: string
	required: boolean
	completed: boolean
}

const WorkflowContent = ({ projectId, locale = 'en' }: { projectId: string; locale?: string }) => {
	const screens = Grid.useBreakpoint()
	const [conditionStatus, setConditionStatus] = useState<any>({ completed: false })
	const [step, setStep] = useState<prismaClient.ProjectWorkflowStep & { tasks: prismaClient.ProjectWorkflowTask[] }>()
	const [workflow, setWorkflow] = useState<ProjectWorkflow>()
	const [drawerVisible, setDrawerVisible] = useState(false)
	const [popoverVisible, setPopoverVisible] = useState(false)
	const [mockTasks, setMockTasks] = useState<ExtendedTask[]>([])
	const { t } = useTolgee()

	// Инициализация моковых задач
	useEffect(() => {
		const tasks: ExtendedTask[] = [
			{
				id: '1',
				label: 'Create project documentation',
				field: 'documentation',
				required: true,
				completed: false,
			},
			{
				id: '2',
				label: 'Setup development environment',
				field: 'dev_environment',
				required: true,
				completed: true,
			},
			{
				id: '3',
				label: 'Schedule kickoff meeting',
				field: 'kickoff_meeting',
				required: false,
				completed: false,
			},
		]
		setMockTasks(tasks)
	}, [])

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
		setMockTasks((prevTasks) => prevTasks.map((task) => (task.id === taskId ? { ...task, completed: checked } : task)))
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

	if (!workflow || !step) return null

	return (
		<div className={styles.container}>
			<Space direction="vertical" style={{ width: '100%' }}>
				<Alert showIcon message="This section in development" />
				<br />

				<Flex justify="space-between" align="center" className={styles.stepHeader}>
					<div className={styles.stepTitle}>
						<Text style={{ margin: 0 }}>
							<T keyName="workflow.current-step">Current step</T>
						</Text>
						<Title level={2} className={styles.stepName}>
							{capitalize(t(`workflow.${workflow.title}.step${currentStageIndex + 1}.name`, step.name))}
						</Title>
					</div>
					<div className={styles.stepActions}>
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
									<Popover content={t('Actions are not completed')}>
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
								<WorkflowStepContent step={step} locale={locale} />
							</div>

							{!screens.lg && mockTasks.length > 0 && (
								<div className={styles.stepContent}>
									<Title level={3}>
										<T keyName="workflow.actions.title">Actions</T>
									</Title>
									<div className={styles.tasksContainer}>
										{mockTasks.map((task) => (
											<div key={task.id} className={styles.taskItem}>
												<Checkbox
													checked={task.completed}
													onChange={(e) => handleTaskStatusChange(task.id, e.target.checked)}
												>
													<span className={task.completed ? styles.completedTask : ''}>{task.label}</span>
												</Checkbox>
												<div>
													{task.required ? <Tag color="red">Required</Tag> : <Tag color="blue">Optional</Tag>}
													{task.completed && <Tag color="green">Completed</Tag>}
												</div>
											</div>
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
									<T keyName="workflow.actions.title">Actions</T>
								</Title>
								{mockTasks.length > 0 ? (
									<div className={styles.tasksContainer}>
										{mockTasks.map((task) => (
											<div key={task.id} className={styles.taskItem}>
												<Checkbox
													checked={task.completed}
													onChange={(e) => handleTaskStatusChange(task.id, e.target.checked)}
												>
													<span className={task.completed ? styles.completedTask : ''}>{task.label}</span>
												</Checkbox>
												<div>
													{task.required ? <Tag color="red">Required</Tag> : <Tag color="blue">Optional</Tag>}
													{task.completed && <Tag color="green">Completed</Tag>}
												</div>
											</div>
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
