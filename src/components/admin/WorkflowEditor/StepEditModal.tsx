import React, { useState } from 'react'
import { WorkflowStepTemplate, WorkflowTaskTemplate } from '@/types/workflow'
import { PlusOutlined, DeleteOutlined, MenuOutlined } from '@ant-design/icons'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Modal, Form, Input, Button, Typography, Row, Col, Divider, Popconfirm, Card } from 'antd'
import TaskEditModal from './TaskEditModal'

const { Title } = Typography
const { TextArea } = Input

interface StepEditModalProps {
	visible: boolean
	onClose: () => void
	onSave: (step: WorkflowStepTemplate) => void
	step: WorkflowStepTemplate | null
	isNew?: boolean
}

export const StepEditModal: React.FC<StepEditModalProps> = ({ visible, onClose, onSave, step, isNew = false }) => {
	const [form] = Form.useForm()
	const [taskEditModal, setTaskEditModal] = useState<{
		visible: boolean
		task: WorkflowTaskTemplate | null
		taskIndex: number
		isNew: boolean
	}>({
		visible: false,
		task: null,
		taskIndex: -1,
		isNew: false,
	})

	React.useEffect(() => {
		if (visible && step) {
			form.setFieldsValue({
				name: step.name || '',
				title: step.title || '',
				description: step.description || '',
				tasks: step.tasks || [],
			})
		} else if (visible && isNew) {
			form.setFieldsValue({
				name: '',
				title: '',
				description: '',
			})
		}
	}, [visible, step, form, isNew])

	const handleSave = async () => {
		try {
			const values = await form.validateFields()
			const updatedStep: WorkflowStepTemplate = {
				id: step?.id || Date.now().toString(),
				...values,
				tasks: isNew ? [] : values.tasks || [],
			}
			onSave(updatedStep)
			onClose()
		} catch (error) {
			console.error('Validation failed:', error)
		}
	}

	const addTask = () => {
		setTaskEditModal({
			visible: true,
			task: null,
			taskIndex: -1,
			isNew: true,
		})
	}

	const editTask = (taskIndex: number) => {
		const tasks = form.getFieldValue('tasks') || []
		setTaskEditModal({
			visible: true,
			task: tasks[taskIndex],
			taskIndex,
			isNew: false,
		})
	}

	const handleTaskSave = (updatedTask: WorkflowTaskTemplate) => {
		const tasks = form.getFieldValue('tasks') || []

		if (taskEditModal.isNew) {
			tasks.push(updatedTask)
		} else {
			tasks[taskEditModal.taskIndex] = updatedTask
		}

		form.setFieldValue('tasks', [...tasks])
		setTaskEditModal({ visible: false, task: null, taskIndex: -1, isNew: false })
	}

	const removeTask = (taskIndex: number) => {
		const tasks = form.getFieldValue('tasks') || []
		tasks.splice(taskIndex, 1)
		form.setFieldValue('tasks', [...tasks])
	}

	const onDragEnd = (result: any) => {
		if (!result.destination) return

		const tasks = form.getFieldValue('tasks') || []
		const [removed] = tasks.splice(result.source.index, 1)
		tasks.splice(result.destination.index, 0, removed)
		form.setFieldValue('tasks', [...tasks])
	}

	return (
		<>
			<Modal
				title={isNew ? 'Новый этап' : 'Редактировать этап'}
				open={visible}
				onCancel={onClose}
				width={800}
				destroyOnClose={true}
				maskClosable={false}
				getContainer={false}
				footer={
					<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
						<Button onClick={onClose}>Отмена</Button>
						<Button type="primary" onClick={handleSave}>
							{isNew ? 'Создать' : 'Сохранить'}
						</Button>
					</div>
				}
			>
				<Form form={form} layout="vertical" className="formSection">
					<Row gutter={[16, 16]}>
						<Col xs={24} lg={12}>
							<Form.Item name="title" label="Название этапа" rules={[{ required: true, message: 'Введите название' }]}>
								<Input placeholder="Название этапа" />
							</Form.Item>
						</Col>
						<Col xs={24} lg={12}>
							<Form.Item
								name="name"
								label="Идентификатор этапа"
								rules={[
									{ required: true, message: 'Введите идентификатор' },
									{
										pattern: /^[a-z0-9-]+$/,
										message: 'Только маленькие латинские буквы, цифры и дефисы',
									},
								]}
							>
								<Input placeholder="step-name" />
							</Form.Item>
						</Col>
						<Col span={24}>
							<Form.Item name="description" label="Описание этапа">
								<TextArea rows={3} placeholder="Описание этапа" />
							</Form.Item>
						</Col>
					</Row>

					{!isNew && (
						<>
							<Divider />
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
								<Title level={4} style={{ margin: 0 }}>
									Задачи
								</Title>
								<Button type="primary" icon={<PlusOutlined />} onClick={addTask}>
									Добавить задачу
								</Button>
							</div>

							<DragDropContext onDragEnd={onDragEnd}>
								<Droppable droppableId="tasks">
									{(provided) => (
										<div {...provided.droppableProps} ref={provided.innerRef}>
											<Form.List name="tasks">
												{(fields) => (
													<>
														{fields.map((field, taskIndex) => (
															<Draggable key={field.key} draggableId={`task-${field.key}`} index={taskIndex}>
																{(provided) => (
																	<div ref={provided.innerRef} {...provided.draggableProps}>
																		<Card
																			size="small"
																			style={{ marginBottom: 8 }}
																			title={
																				<div
																					style={{
																						display: 'flex',
																						alignItems: 'center',
																						justifyContent: 'space-between',
																					}}
																				>
																					<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
																						<div {...provided.dragHandleProps} style={{ cursor: 'move' }}>
																							<MenuOutlined />
																						</div>
																						<span>
																							{form.getFieldValue(['tasks', taskIndex, 'title']) ||
																								`Задача ${taskIndex + 1}`}
																						</span>
																					</div>
																					<div style={{ display: 'flex', gap: 8 }}>
																						<Button type="text" size="small" onClick={() => editTask(taskIndex)}>
																							Редактировать
																						</Button>
																						<Popconfirm title="Удалить задачу?" onConfirm={() => removeTask(taskIndex)}>
																							<Button type="text" danger icon={<DeleteOutlined />} size="small" />
																						</Popconfirm>
																					</div>
																				</div>
																			}
																		>
																			<div style={{ color: '#666' }}>
																				{form.getFieldValue(['tasks', taskIndex, 'description']) || 'Нет описания'}
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
						</>
					)}
				</Form>
			</Modal>

			<TaskEditModal
				visible={taskEditModal.visible}
				onClose={() => {
					setTaskEditModal({ visible: false, task: null, taskIndex: -1, isNew: false })
					// Ensure body scroll is restored
					setTimeout(() => {
						document.body.style.overflow = ''
					}, 100)
				}}
				onSave={handleTaskSave}
				task={taskEditModal.task}
				isNew={taskEditModal.isNew}
			/>
		</>
	)
}

export default StepEditModal
