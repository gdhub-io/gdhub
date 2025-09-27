import { useContext, useEffect, useMemo, useState } from 'react'
import { ProjectContext } from '@/contexts/ProjectContext'
import { gtmEventTrigger } from '@/helpers/gtm'
import { capitalize } from '@/helpers/text'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { CiViewList } from '@react-icons/all-files/ci/CiViewList'
import { IoMdArrowForward } from '@react-icons/all-files/io/IoMdArrowForward'
import { useMutation, useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Col, Drawer, Flex, Grid, Modal, Popover, Row, Space, Steps, Typography } from 'antd'
import axios from 'axios'
import styles from './style.module.scss'
import WorkflowStepContent from './WorkflowStepContent'
import WorkflowTaskCard from './WorkflowTaskCard'
import { RoadmapChart } from '../RoadmapChart'

const { Title, Text } = Typography

export type ProjectWorkflow = prismaClient.ProjectWorkflow & { steps: prismaClient.ProjectWorkflowStep[] }

type EquityPromise = {
	id: string
	percentage: number
	owner: {
		id: string
		name: string
	}
	allocation: {
		owner: {
			name: string
		}
		percentage: number
	}
}

export type ProjectWorkflowWithSteps = ProjectWorkflow & {
	steps: (prismaClient.ProjectWorkflowStep & {
		equityPromises?: EquityPromise[]
	})[]
	currentStep: prismaClient.ProjectWorkflowStep & {
		tasks: prismaClient.ProjectWorkflowTask[]
		equityPromises?: (EquityPromise & { allocation: { owner: { name: string } } })[]
	}
}

const WorkflowContent = ({ projectId, locale = 'en' }: { projectId: string; locale?: string }) => {
	const screens = Grid.useBreakpoint()
	const projectContext = useContext(ProjectContext)?.contextProject
	const [conditionStatus, setConditionStatus] = useState<any>({ completed: false })
	const [workflow, setWorkflow] = useState<ProjectWorkflowWithSteps>()
	const [drawerVisible, setDrawerVisible] = useState(false)
	const [popoverVisible, setPopoverVisible] = useState(false)
	const [taskStatuses, setTaskStatuses] = useState<Record<string, boolean>>({})
	const [equityTransferModalVisible, setEquityTransferModalVisible] = useState(false)
	const { t } = useTolgee()
	const isAuthor = useMemo(() => projectContext?.isProjectAuthor, [projectContext])

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

	const { data: workflowResponse, refetch: refetchWorkflowData } = useQuery({
		queryKey: ['project-workflow', projectId],
		queryFn: () =>
			axios.get<ProjectWorkflowWithSteps>('/api/user/project/workflow', {
				params: { projectId },
			}),
		enabled: !!projectId,
		refetchOnWindowFocus: false,
	})

	useEffect(() => {
		if (workflowResponse?.data) {
			setWorkflow(workflowResponse.data)
		}
	}, [workflowResponse])

	const { mutateAsync: moveProjectToStep, isPending: isMoving } = useMutation({
		mutationFn: (data: { projectId: string; direction: 'next' | 'previous'; targetStepId?: string }) =>
			axios.put<void>(`/api/project/move`, data),
		onSuccess: () => {
			refetchWorkflowData()
		},
	})

	const currentStepOrder = useMemo(() => {
		return workflow?.currentStep?.order || 0
	}, [workflow])

	const isIntroductionStep = useMemo(() => workflow?.currentStep.order === 0, [workflow?.currentStep.order])
	const isCompletionStep = useMemo(
		() => workflow && workflow?.currentStep.order === workflow?.steps.length - 1,
		[workflow?.currentStep.order, workflow?.steps]
	)
	const isRoadmapStep = useMemo(() => !isIntroductionStep && !isCompletionStep, [isIntroductionStep, isCompletionStep])

	const handlePreviousStep = () => {
		moveProjectToStep({ projectId, direction: 'previous' })
		gtmEventTrigger('workflow_move', {
			projectId,
			direction: 'previous',
			currentStep: workflow?.currentStep.name,
			previousStep: workflow?.steps[currentStepOrder - 1].name,
		})
	}

	const handleNextStep = () => {
		if (workflow?.currentStep.equityPromises && workflow.currentStep.equityPromises.length > 0) {
			setEquityTransferModalVisible(true)
		} else {
			moveProjectToStep({ projectId, direction: 'next' })
			gtmEventTrigger('workflow_move', {
				projectId,
				direction: 'next',
				currentStep: workflow?.currentStep.name,
				nextStep: workflow?.steps[currentStepOrder + 1].name,
			})
		}
	}

	const handleEquityTransferConfirm = async () => {
		await moveProjectToStep({ projectId, direction: 'next' })
		setEquityTransferModalVisible(false)
	}

	useEffect(() => {
		const stepTasks = workflow?.currentStep?.tasks

		if (!stepTasks || stepTasks.length === 0) {
			setConditionStatus({ completed: true })
			return
		}

		if (stepTasks.every((t) => t.done)) {
			setConditionStatus({ completed: true })
		}
	}, [workflow?.currentStep?.tasks])

	const handleTaskStatusChange = (taskId: string, checked: boolean) => {
		if (taskId === '1') {
			setConditionStatus((prev: any) => ({ ...prev, completed: checked }))
		} else {
			setTaskStatuses((prev) => ({ ...prev, [taskId]: checked }))
		}
	}

	const stepsStepsList = (
		<div className={styles.stepsWrapper}>
			<Steps
				direction="vertical"
				current={currentStepOrder}
				items={workflow?.steps.map((s, idx: number) => ({
					key: s.id,
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
				{!isIntroductionStep && !isCompletionStep && (
					<Flex justify="space-between" align="center" gap={32} className={styles.stepHeader}>
						<RoadmapChart workflow={workflow} editable={isAuthor} />

						{isAuthor && (
							<div className={styles.stepTasks}>
								{currentStepOrder > 0 && (
									<Button onClick={handlePreviousStep} disabled={isMoving} type="text">
										<T keyName="workflow.previous-step">Previous</T>
									</Button>
								)}

								<Popover
									content={stepsStepsList}
									trigger="click"
									open={popoverVisible}
									onOpenChange={setPopoverVisible}
								>
									<Button type="text" icon={<CiViewList size={24} />} />
								</Popover>

								{currentStepOrder < workflow.steps.length - 1 && (
									<>
										{conditionStatus.completed == false ? (
											<Popover content={t('Tasks are not completed')}>
												<Button disabled={conditionStatus.completed == false}>
													<T keyName="workflow.next-step">Next step</T>
												</Button>
											</Popover>
										) : (
											<Button onClick={handleNextStep} disabled={isMoving}>
												<T keyName="workflow.next-step">Next step</T>
											</Button>
										)}
									</>
								)}
							</div>
						)}
					</Flex>
				)}

				<Row gutter={[32, 32]}>
					<Col xs={24} lg={16}>
						<Space direction="vertical" size={[32, 16]} style={{ width: '100%' }}>
							<div className={styles.stepContent}>
								<WorkflowStepContent step={workflow.currentStep} locale={locale} />
							</div>

							{isIntroductionStep && (
								<Button type="primary" onClick={handleNextStep} disabled={isMoving}>
									<Space size={8}>
										{t('workflow.start-step', 'Go to the next step')}
										<IoMdArrowForward style={{ display: 'block' }} />
									</Space>
								</Button>
							)}

							{!screens.lg && workflow.currentStep?.tasks?.length > 0 && (
								<div className={styles.stepContent}>
									<Title level={3}>
										<T keyName="workflow.tasks.title">Tasks</T>
									</Title>
									<div className={styles.tasksContainer}>
										{workflow.currentStep?.tasks?.map((task) => (
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
					{screens.lg && isRoadmapStep && (
						<Col xs={24} lg={8}>
							<div className={styles.sidebarContent}>
								<Title level={3}>
									<T keyName="workflow.tasks.title">Tasks</T>
								</Title>
								{workflow.currentStep?.tasks?.length > 0 ? (
									<div className={styles.tasksContainer}>
										{workflow.currentStep?.tasks?.map((task) => (
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

			<Modal
				title={<T keyName="workflow.equity-transfer.title">Equity Transfer Confirmation</T>}
				open={equityTransferModalVisible}
				onOk={handleEquityTransferConfirm}
				onCancel={() => setEquityTransferModalVisible(false)}
				confirmLoading={isMoving}
			>
				<Space direction="vertical" style={{ width: '100%' }}>
					<Text>
						<T keyName="workflow.equity-transfer.description">
							By proceeding to the next step, the following equity promises will be transferred to actual allocations:
						</T>
					</Text>
					{workflow?.currentStep?.equityPromises?.map((promise) => (
						<Space key={promise.id} style={{ width: '100%' }}>
							<Text>
								<Text strong>{promise.allocation.owner.name}:</Text> +{promise.percentage}%
							</Text>
							<Text type="secondary">
								{t('workflow.equity-transfer.total', 'Total after transfer: {total}%', {
									total: (promise.allocation.percentage + promise.percentage).toString(),
								})}
							</Text>
						</Space>
					))}
				</Space>
			</Modal>

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
