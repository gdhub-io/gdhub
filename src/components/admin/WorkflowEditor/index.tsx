import { useState, useEffect } from 'react'
import { WorkflowSchema, WorkflowStepTemplate, WorkflowTaskTemplate, normalizeWorkflowSteps } from '@/types/workflow'
import { PlusOutlined, DeleteOutlined, MenuOutlined, EditOutlined, SettingOutlined } from '@ant-design/icons'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Breadcrumb, theme, Form, Button, Card, Typography, Popconfirm, message, Row, Col, Space, Flex } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import Link from 'next/link'
import StepEditModal from './StepEditModal'
import styles from './style.module.scss'
import WorkflowSettingsModal from './WorkflowSettingsModal'

const { Title, Text } = Typography

// Helper functions for validation
export const validateWorkflowName = (name: string): boolean => {
	return /^[a-z0-9-]+$/.test(name)
}

export const WorkflowEditor = ({ id }: { id: string }) => {
	const { token } = theme.useToken()
	const queryClient = useQueryClient()
	const [form] = Form.useForm()
	const [isFormInitialized, setIsFormInitialized] = useState(false)
	const [workflowTitle, setWorkflowTitle] = useState('New Workflow')
	const [workflowDescription, setWorkflowDescription] = useState('')
	const [workflowName, setWorkflowName] = useState('')
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

	const { data: workflow, isLoading } = useQuery(['workflow', id], () => axios.get(`/api/admin/workflow/${id}`), {
		onSuccess: (response) => {
			const workflowData = response.data as WorkflowSchema
			console.log('Loaded workflow data:', workflowData)

			// Set component state
			setWorkflowTitle(workflowData.title || workflowData.name || 'New Workflow')
			setWorkflowDescription(workflowData.description || '')
			setWorkflowName(workflowData.name || '')

			// Normalize the steps from JSON format
			const normalizedSteps = normalizeWorkflowSteps(workflowData.steps || [])

			form.setFieldsValue({
				steps: normalizedSteps,
			})

			setIsFormInitialized(true)
			console.log('Form initialized with steps:', normalizedSteps)
		},
	})

	const { mutateAsync: updateWorkflow, isLoading: isSaving } = useMutation(
		(data: any) => axios.put(`/api/admin/workflow/${id}`, data),
		{
			onSuccess: () => {
				message.success('Воркфлоу успешно сохранен!')
				queryClient.invalidateQueries(['workflow', id])
				setHasUnsavedChanges(false)
			},
			onError: () => {
				message.error('Ошибка при сохранении воркфлоу')
			},
		}
	)

	const handleSave = async () => {
		try {
			const values = await form.validateFields()

			// Convert steps back to JSON format for database
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

	// Ensure body scroll is restored when component unmounts
	useEffect(() => {
		return () => {
			document.body.style.overflow = ''
		}
	}, [])

	if (isLoading) {
		return <div>Загрузка...</div>
	}

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
						title: <span>{workflowTitle}</span>,
					},
				]}
				style={{ marginBottom: 24 }}
			/>

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
							Last updated on {dayjs(workflow?.data?.updatedAt).format('DD/MM/YYYY')}
						</p>
					</div>
					<div className={styles.headerActions}>
						<Button icon={<SettingOutlined />} onClick={() => setSettingsModalVisible(true)}>
							Настройки
						</Button>
						<Button type="primary" onClick={handleSave} disabled={!hasUnsavedChanges} loading={isSaving}>
							Сохранить
						</Button>
					</div>
				</Flex>
			</div>

			<Form form={form} layout="vertical">
				<Row gutter={[24, 24]}>
					<Col span={24}>
						<Card
							title="Этапы (Steps)"
							className={styles.mainCard}
							extra={
								<Button type="primary" icon={<PlusOutlined />} onClick={addStep}>
									Добавить этап
								</Button>
							}
						>
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
																							`Этап ${stepIndex + 1}`}
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
																			<div className={styles.stepTaskCount}>
																				{form.getFieldValue(['steps', stepIndex, 'tasks'])?.length || 0} задач
																			</div>
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
						</Card>
					</Col>
				</Row>
			</Form>

			<StepEditModal
				visible={stepEditModal.visible}
				onClose={handleStepModalClose}
				onSave={handleStepSave}
				step={stepEditModal.step}
				isNew={stepEditModal.isNew}
			/>

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
		</div>
	)
}
