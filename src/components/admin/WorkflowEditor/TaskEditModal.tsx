import React from 'react'
import { WorkflowTaskTemplate } from '@/types/workflow'
import { Modal, Form, Input, Button, Checkbox, Row, Col } from 'antd'

const { TextArea } = Input

interface TaskEditModalProps {
	visible: boolean
	onClose: () => void
	onSave: (task: WorkflowTaskTemplate) => void
	task: WorkflowTaskTemplate | null
	isNew?: boolean
}

export const TaskEditModal: React.FC<TaskEditModalProps> = ({ visible, onClose, onSave, task, isNew = false }) => {
	const [form] = Form.useForm()

	React.useEffect(() => {
		if (visible && task) {
			form.setFieldsValue({
				name: task.name || '',
				title: task.title || '',
				description: task.description || '',
				required: task.required || false,
			})
		} else if (visible && isNew) {
			form.setFieldsValue({
				name: '',
				title: '',
				description: '',
				required: false,
			})
		}
	}, [visible, task, form, isNew])

	const handleSave = async () => {
		try {
			const values = await form.validateFields()
			const updatedTask: WorkflowTaskTemplate = {
				id: task?.id || Date.now().toString(),
				...values,
			}
			onSave(updatedTask)
			onClose()
		} catch (error) {
			console.error('Validation failed:', error)
		}
	}

	return (
		<Modal
			title={isNew ? 'Новая задача' : 'Редактировать задачу'}
			open={visible}
			onCancel={onClose}
			width={600}
			destroyOnClose={true}
			maskClosable={false}
			getContainer={() => document.body}
			footer={
				<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
					<Button onClick={onClose}>Отмена</Button>
					<Button type="primary" onClick={handleSave}>
						{isNew ? 'Создать' : 'Сохранить'}
					</Button>
				</div>
			}
		>
			<Form form={form} layout="vertical">
				<Row gutter={[16, 16]}>
					<Col xs={24} lg={12}>
						<Form.Item name="title" label="Название задачи" rules={[{ required: true, message: 'Введите название' }]}>
							<Input placeholder="Название задачи" />
						</Form.Item>
					</Col>
					<Col xs={24} lg={12}>
						<Form.Item
							name="name"
							label="Идентификатор задачи"
							rules={[
								{ required: true, message: 'Введите идентификатор' },
								{
									pattern: /^[a-z0-9-]+$/,
									message: 'Только маленькие латинские буквы, цифры и дефисы',
								},
							]}
						>
							<Input placeholder="task-name" />
						</Form.Item>
					</Col>
					<Col span={24}>
						<Form.Item name="description" label="Описание задачи">
							<TextArea rows={4} placeholder="Описание задачи" />
						</Form.Item>
					</Col>
					<Col span={24}>
						<Form.Item name="required" valuePropName="checked">
							<Checkbox>Обязательная задача</Checkbox>
						</Form.Item>
					</Col>
				</Row>
			</Form>
		</Modal>
	)
}

export default TaskEditModal
