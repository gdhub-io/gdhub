import { useState, useEffect } from 'react'
import { WorkflowStepTemplate, WorkflowTaskTemplate, normalizeWorkflowSteps } from '@/types/workflow'
import { PlusOutlined, DeleteOutlined, MenuOutlined, EditOutlined, SettingOutlined } from '@ant-design/icons'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	Breadcrumb,
	theme,
	Form,
	Button,
	Card,
	Typography,
	Popconfirm,
	message,
	Row,
	Col,
	Space,
	Flex,
	Select,
	Checkbox,
} from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import Link from 'next/link'
import StepEditModal from './StepEditModal'
import styles from './style.module.scss'
import TaskEditModal from './TaskEditModal'
import WorkflowSettingsModal from './WorkflowSettingsModal'

const { Title, Text } = Typography

// Helper functions for validation
export const validateWorkflowName = (name: string): boolean => {
	return /^[a-z0-9-]+$/.test(name)
}

type WorkflowType = 'template' | 'project'

interface WorkflowEditorProps {
	id: string
	type?: WorkflowType
}

export const WorkflowEditor = ({ id, type = 'template' }: WorkflowEditorProps) => {
	const { token } = theme.useToken()
	const queryClient = useQueryClient()
	const [form] = Form.useForm()
	const [isFormInitialized, setIsFormInitialized] = useState(false)
	const [workflowTitle, setWorkflowTitle] = useState('New Workflow')
	const [workflowDescription, setWorkflowDescription] = useState('')
	const [workflowName, setWorkflowName] = useState('')
	const [currentStepId, setCurrentStepId] = useState<string | null>(null)
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
	const [stepEditModal, setStepEditModal] = useState<{
		visible: boolean
		step: WorkflowStepTemplate | null
		stepIndex: number
		isNew: boolean
	}>({
		visible: false,
		step: null,
		stepIndex: -1,
		isNew: false,
	})
	const [settingsModalVisible, setSettingsModalVisible] = useState(false)
	const [taskEditModal, setTaskEditModal] = useState<{
		visible: boolean
		task: WorkflowTaskTemplate | null
		stepIndex: number
		taskIndex: number
		isNew: boolean
	}>({
		visible: false,
		task: null,
		stepIndex: -1,
		taskIndex: -1,
		isNew: false,
	})

	// Choose endpoints based on type
	const getEndpoint = () => {
		if (type === 'project') {
			return `/api/admin/project-workflow/${id}`
		}
		return `/api/admin/workflow/${id}`
	}

	const queryKey = type === 'project' ? ['project-workflow', id] : ['workflow', id]

	const { data: workflow, isLoading } = useQuery(queryKey, () => axios.get(getEndpoint()), {
		onSuccess: (response) => {
			const workflowData = response.data

			if (type === 'project') {
				// Handle ProjectWorkflow data structure
				setWorkflowTitle(workflowData.title || workflowData.project?.name || 'Project Workflow')
				setWorkflowDescription(workflowData.description || '')
				setWorkflowName(workflowData.name || '')
				setCurrentStepId(workflowData.currentStepId || null)

				// Convert ProjectWorkflow steps to WorkflowStepTemplate format
				const normalizedSteps = (workflowData.steps || []).map((step: any) => ({
					id: step.id,
					name: step.name,
					title: step.name,
					description: step.description || '',
					order: step.order || 0,
					tasks: (step.tasks || []).map((task: any) => ({
						id: task.id,
						name: task.description || '', // Use description as name since ProjectWorkflowTask has no name field
						title: task.description || '', // Use description as title since ProjectWorkflowTask has no name field
						description: task.description || '',
						required: Boolean(task.required),
						order: task.order || 0,
						done: Boolean(task.done),
					})),
				}))

				form.setFieldsValue({
					steps: normalizedSteps,
				})
			} else {
				// Handle WorkflowSchema data structure
				setWorkflowTitle(workflowData.title || workflowData.name || 'New Workflow')
				setWorkflowDescription(workflowData.description || '')
				setWorkflowName(workflowData.name || '')

				// Normalize the steps from JSON format
				const normalizedSteps = normalizeWorkflowSteps(workflowData.steps || [])

				form.setFieldsValue({
					steps: normalizedSteps,
				})
			}

			setIsFormInitialized(true)
		},
	})

	const { mutateAsync: updateWorkflow, isLoading: isSaving } = useMutation(
		(data: any) => axios.put(getEndpoint(), data),
		{
			onSuccess: () => {
				message.success(type === 'project' ? 'Проектный воркфлоу успешно сохранен!' : 'Воркфлоу успешно сохранен!')
				queryClient.invalidateQueries(queryKey)
				if (type === 'project') {
					queryClient.invalidateQueries(['admin', 'project-workflows'])
				} else {
					queryClient.invalidateQueries(['admin', 'workflows'])
				}
				setHasUnsavedChanges(false)
			},
			onError: () => {
				message.error(
					type === 'project' ? 'Ошибка при сохранении проектного воркфлоу' : 'Ошибка при сохранении воркфлоу'
				)
			},
		}
	)

	const handleSave = async () => {
		try {
			const values = await form.validateFields()

			if (type === 'project') {
				// For ProjectWorkflow, save both title and steps structure
				const stepsWithOrder = (values.steps || []).map((step: WorkflowStepTemplate, index: number) => ({
					...step,
					order: index,
					tasks: (step.tasks || []).map((task: WorkflowTaskTemplate, taskIndex: number) => ({
						...task,
						order: taskIndex,
					})),
				}))

				await updateWorkflow({
					title: workflowTitle,
					steps: stepsWithOrder,
					currentStepId: currentStepId,
				})
			} else {
				// For WorkflowSchema, save the full structure
				const stepsWithOrder = (values.steps || []).map((step: WorkflowStepTemplate, index: number) => ({
					...step,
					order: index,
					tasks: (step.tasks || []).map((task: WorkflowTaskTemplate, taskIndex: number) => ({
						...task,
						order: taskIndex,
					})),
				}))

				await updateWorkflow({
					name: workflowName,
					title: workflowTitle,
					description: workflowDescription,
					steps: stepsWithOrder,
				})
			}
		} catch (error) {
			console.error('Validation failed:', error)
		}
	}

	const handleSettingsSave = (settings: { title: string; description: string; name: string }) => {
		setWorkflowTitle(settings.title)
		setWorkflowDescription(settings.description)
		setWorkflowName(settings.name)
		setHasUnsavedChanges(true)
	}

	const addStep = () => {
		setStepEditModal({
			visible: true,
			step: null,
			stepIndex: -1,
			isNew: true,
		})
	}

	const editStep = (stepIndex: number) => {
		const steps = form.getFieldValue('steps') || []
		setStepEditModal({
			visible: true,
			step: steps[stepIndex],
			stepIndex,
			isNew: false,
		})
	}

	const handleStepSave = (updatedStep: WorkflowStepTemplate) => {
		const steps = form.getFieldValue('steps') || []

		if (stepEditModal.isNew) {
			steps.push(updatedStep)
		} else {
			steps[stepEditModal.stepIndex] = updatedStep
		}

		form.setFieldValue('steps', [...steps])
		setHasUnsavedChanges(true)
		setStepEditModal({ visible: false, step: null, stepIndex: -1, isNew: false })
	}

	const handleStepModalClose = () => {
		setStepEditModal({ visible: false, step: null, stepIndex: -1, isNew: false })
		// Ensure body scroll is restored
		setTimeout(() => {
			document.body.style.overflow = ''
		}, 100)
	}

	const removeStep = (stepIndex: number) => {
		const steps = form.getFieldValue('steps') || []
		steps.splice(stepIndex, 1)
		form.setFieldValue('steps', [...steps])
		setHasUnsavedChanges(true)
	}

	const onDragEnd = (result: any) => {
		if (!result.destination) return

		const { source, destination } = result
		const steps = form.getFieldValue('steps') || []
		const [removed] = steps.splice(source.index, 1)
		steps.splice(destination.index, 0, removed)
		form.setFieldValue('steps', [...steps])
		setHasUnsavedChanges(true)
	}

	const handleTitleChange = (value: string) => {
		setWorkflowTitle(value)
		setHasUnsavedChanges(true)
	}

	const handleCurrentStepChange = (stepId: string) => {
		setCurrentStepId(stepId)
		setHasUnsavedChanges(true)
	}

	const handleTaskStatusChange = (stepIndex: number, taskIndex: number, done: boolean) => {
		const steps = form.getFieldValue('steps') || []
		if (steps[stepIndex] && steps[stepIndex].tasks && steps[stepIndex].tasks[taskIndex]) {
			steps[stepIndex].tasks[taskIndex].done = done
			form.setFieldValue('steps', [...steps])
			setHasUnsavedChanges(true)
		}
	}

	const addTask = (stepIndex: number) => {
		setTaskEditModal({
			visible: true,
			task: null,
			stepIndex,
			taskIndex: -1,
			isNew: true,
		})
	}

	const editTask = (stepIndex: number, taskIndex: number) => {
		const steps = form.getFieldValue('steps') || []
		const task = steps[stepIndex]?.tasks?.[taskIndex]
		if (task) {
			setTaskEditModal({
				visible: true,
				task,
				stepIndex,
				taskIndex,
				isNew: false,
			})
		}
	}

	const handleTaskSave = (updatedTask: WorkflowTaskTemplate) => {
		const steps = form.getFieldValue('steps') || []

		if (taskEditModal.isNew) {
			// Add new task
			if (!steps[taskEditModal.stepIndex].tasks) {
				steps[taskEditModal.stepIndex].tasks = []
			}
			steps[taskEditModal.stepIndex].tasks.push(updatedTask)
		} else {
			// Update existing task
			steps[taskEditModal.stepIndex].tasks[taskEditModal.taskIndex] = updatedTask
		}

		form.setFieldValue('steps', [...steps])
		setHasUnsavedChanges(true)
		setTaskEditModal({ visible: false, task: null, stepIndex: -1, taskIndex: -1, isNew: false })
	}

	const removeTask = (stepIndex: number, taskIndex: number) => {
		const steps = form.getFieldValue('steps') || []
		if (steps[stepIndex]?.tasks) {
			steps[stepIndex].tasks.splice(taskIndex, 1)
			form.setFieldValue('steps', [...steps])
			setHasUnsavedChanges(true)
		}
	}

	const handleTaskModalClose = () => {
		setTaskEditModal({ visible: false, task: null, stepIndex: -1, taskIndex: -1, isNew: false })
		// Ensure body scroll is restored
		setTimeout(() => {
			document.body.style.overflow = ''
		}, 100)
	}

	// Ensure body scroll is restored when component unmounts
	useEffect(() => {
		return () => {
			document.body.style.overflow = ''
		}
	}, [])

	if (isLoading) {
		return <div>Загрузка...</div>
	}

	const workflowData = workflow?.data
	const isProjectWorkflow = type === 'project'

	return (
		<div className={styles.container}>
			<Breadcrumb
				items={[
					{
						title: (
							<Link href="/admin/workflows" style={{ color: token.colorPrimary }}>
								Workflows
							</Link>
						),
					},
					{
						title: isProjectWorkflow ? 'Project Workflows' : 'Templates',
					},
					{
						title: <span>{workflowTitle}</span>,
					},
				]}
				style={{ marginBottom: 24 }}
			/>

			{isProjectWorkflow && workflowData?.project && (
				<Card style={{ marginBottom: 24 }}>
					<Row gutter={[16, 16]}>
						<Col span={12}>
							<Text strong>Проект:</Text> {workflowData.project.name}
						</Col>
						<Col span={12}>
							<Text strong>Автор:</Text> {workflowData.project.author.name}
						</Col>
						<Col span={12}>
							<Text strong>Создан:</Text> {dayjs(workflowData.createdAt).format('DD/MM/YYYY')}
						</Col>
						<Col span={12}>
							<Text strong>Шагов:</Text> {workflowData.steps?.length || 0}
						</Col>
					</Row>
				</Card>
			)}

			<div>
				<Flex justify="space-between" align="center">
					<div>
						<Title
							level={1}
							className={styles.workflowTitle}
							editable={{
								triggerType: ['text'],
								maxLength: 150,
								onChange: handleTitleChange,
							}}
						>
							{workflowTitle}
						</Title>
						<p className={styles.workflowSubtitle}>
							Last updated on {dayjs(workflowData?.updatedAt).format('DD/MM/YYYY')}
						</p>
					</div>
					<div className={styles.headerActions}>
						{isProjectWorkflow && (
							<Space>
								<Text strong>Текущий этап:</Text>
								<Select
									style={{ width: 200 }}
									placeholder="Выберите текущий этап"
									value={currentStepId}
									onChange={handleCurrentStepChange}
									allowClear
								>
									{(workflowData?.steps || []).map((step: any) => (
										<Select.Option key={step.id} value={step.id}>
											{step.name}
										</Select.Option>
									))}
								</Select>
							</Space>
						)}
						{!isProjectWorkflow && (
							<Button icon={<SettingOutlined />} onClick={() => setSettingsModalVisible(true)}>
								Настройки
							</Button>
						)}
						<Button type="primary" onClick={handleSave} disabled={!hasUnsavedChanges} loading={isSaving}>
							Сохранить
						</Button>
					</div>
				</Flex>
			</div>

			<div style={{ marginBottom: 24 }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
					<Title level={2} style={{ margin: 0 }}>
						{isProjectWorkflow ? 'Шаги проекта' : 'Этапы (Steps)'}
					</Title>
					<Button type="primary" icon={<PlusOutlined />} onClick={addStep}>
						Добавить этап
					</Button>
				</div>

				<Form form={form} layout="vertical">
					<DragDropContext onDragEnd={onDragEnd}>
						<Droppable droppableId="steps">
							{(provided) => (
								<div {...provided.droppableProps} ref={provided.innerRef}>
									<Form.List name="steps">
										{(fields) => (
											<>
												{fields.map((field, stepIndex) => (
													<Draggable key={field.key} draggableId={`step-${field.key}`} index={stepIndex}>
														{(provided) => (
															<div ref={provided.innerRef} {...provided.draggableProps} className={styles.stepCard}>
																<Card
																	size="small"
																	title={
																		<div className={styles.stepHeader}>
																			<div {...provided.dragHandleProps} className={styles.dragHandle}>
																				<MenuOutlined />
																			</div>
																			<span>
																				{form.getFieldValue(['steps', stepIndex, 'title']) ||
																					form.getFieldValue(['steps', stepIndex, 'name']) ||
																					`Шаг ${stepIndex + 1}`}
																			</span>
																			<div className={styles.stepActions}>
																				<Button
																					type="text"
																					icon={<EditOutlined />}
																					onClick={() => editStep(stepIndex)}
																					size="small"
																				>
																					Редактировать
																				</Button>
																				<Popconfirm title="Удалить этап?" onConfirm={() => removeStep(stepIndex)}>
																					<Button type="text" danger icon={<DeleteOutlined />} size="small" />
																				</Popconfirm>
																			</div>
																		</div>
																	}
																>
																	<div className={styles.stepDescription}>
																		{form.getFieldValue(['steps', stepIndex, 'description']) || 'Нет описания'}
																	</div>
																	{isProjectWorkflow && (
																		<div style={{ marginTop: 12 }}>
																			<div
																				style={{
																					display: 'flex',
																					justifyContent: 'space-between',
																					alignItems: 'center',
																					marginBottom: 8,
																				}}
																			>
																				<Text strong>Задачи:</Text>
																				<Button
																					type="link"
																					size="small"
																					icon={<PlusOutlined />}
																					onClick={() => addTask(stepIndex)}
																				>
																					Добавить
																				</Button>
																			</div>
																			<div style={{ marginTop: 8 }}>
																				{(form.getFieldValue(['steps', stepIndex, 'tasks']) || []).map(
																					(task: any, taskIndex: number) => (
																						<div
																							key={task.id || taskIndex}
																							style={{
																								display: 'flex',
																								alignItems: 'center',
																								justifyContent: 'space-between',
																								marginBottom: 4,
																								padding: '4px 8px',
																								backgroundColor: '#f8f9fa',
																								borderRadius: '4px',
																							}}
																						>
																							<div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
																								<Checkbox
																									checked={Boolean(task.done)}
																									onChange={(e) =>
																										handleTaskStatusChange(stepIndex, taskIndex, e.target.checked)
																									}
																									style={{ marginRight: 8 }}
																								>
																									<span
																										style={{
																											textDecoration: task.done ? 'line-through' : 'none',
																											color: task.done ? '#999' : 'inherit',
																										}}
																									>
																										{task.title ||
																											task.name ||
																											task.description ||
																											`Задача ${taskIndex + 1}`}
																									</span>
																								</Checkbox>
																							</div>
																							<div style={{ display: 'flex', gap: 4 }}>
																								<Button
																									type="text"
																									size="small"
																									icon={<EditOutlined />}
																									onClick={() => editTask(stepIndex, taskIndex)}
																								/>
																								<Popconfirm
																									title="Удалить задачу?"
																									onConfirm={() => removeTask(stepIndex, taskIndex)}
																								>
																									<Button type="text" size="small" danger icon={<DeleteOutlined />} />
																								</Popconfirm>
																							</div>
																						</div>
																					)
																				)}
																				{(!form.getFieldValue(['steps', stepIndex, 'tasks']) ||
																					form.getFieldValue(['steps', stepIndex, 'tasks']).length === 0) && (
																					<Text type="secondary" style={{ fontSize: '12px' }}>
																						Нет задач
																					</Text>
																				)}
																			</div>
																		</div>
																	)}
																	{!isProjectWorkflow && (
																		<div className={styles.stepTaskCount}>
																			{form.getFieldValue(['steps', stepIndex, 'tasks'])?.length || 0} задач
																		</div>
																	)}
																</Card>
															</div>
														)}
													</Draggable>
												))}
												{provided.placeholder}
											</>
										)}
									</Form.List>
								</div>
							)}
						</Droppable>
					</DragDropContext>
				</Form>
			</div>

			<StepEditModal
				visible={stepEditModal.visible}
				onClose={handleStepModalClose}
				onSave={handleStepSave}
				step={stepEditModal.step}
				isNew={stepEditModal.isNew}
			/>

			{!isProjectWorkflow && (
				<WorkflowSettingsModal
					visible={settingsModalVisible}
					onClose={() => setSettingsModalVisible(false)}
					onSave={handleSettingsSave}
					settings={{
						title: workflowTitle,
						description: workflowDescription,
						name: workflowName,
					}}
				/>
			)}

			<TaskEditModal
				visible={taskEditModal.visible}
				onClose={handleTaskModalClose}
				onSave={handleTaskSave}
				task={taskEditModal.task}
				isNew={taskEditModal.isNew}
			/>
		</div>
	)
}
