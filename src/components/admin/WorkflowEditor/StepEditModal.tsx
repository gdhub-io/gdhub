import React from 'react'
import { WorkflowStepTemplate } from '@/types/workflow'
import { Modal, Form, Input, Button, Row, Col } from 'antd'

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

	return (
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
			</Form>
		</Modal>
	)
}

export default StepEditModal
