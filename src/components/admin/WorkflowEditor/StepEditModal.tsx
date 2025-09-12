import React from 'react'
import { Modal, Form, Input, Button, Row, Col, Space } from 'antd'

const { TextArea } = Input

interface StepEditModalProps {
	visible: boolean
	onClose: () => void
	onSave: (step: any) => void
	step: any
	isNew: boolean
}

export const StepEditModal: React.FC<StepEditModalProps> = ({ visible, onClose, onSave, step, isNew }) => {
	const [form] = Form.useForm()

	React.useEffect(() => {
		if (visible) {
			form.setFieldsValue({
				title: step?.title || '',
				name: step?.name || '',
				description: step?.description || '',
			})
		}
	}, [visible, step, form])

	const handleSave = async () => {
		try {
			const values = await form.validateFields()
			onSave(values)
			onClose()
		} catch (error) {
			console.error('Validation failed:', error)
		}
	}

	const handleClose = () => {
		form.resetFields()
		onClose()
	}

	return (
		<Modal
			title={isNew ? 'Новый этап' : 'Редактировать этап'}
			open={visible}
			onCancel={handleClose}
			width={800}
			centered
			destroyOnHidden
			maskClosable={false}
			footer={
				<Space>
					<Button onClick={handleClose}>Отмена</Button>
					<Button type="primary" onClick={handleSave}>
						{isNew ? 'Создать' : 'Сохранить'}
					</Button>
				</Space>
			}
		>
			<Form form={form} layout="vertical" variant="filled" requiredMark="optional">
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
