import React from 'react'
import { Modal, Form, Input, Button, Row, Col } from 'antd'

const { TextArea } = Input

interface WorkflowSettingsModalProps {
	visible: boolean
	onClose: () => void
	onSave: (settings: { title: string; description: string; name: string }) => void
	settings: {
		title: string
		description: string
		name: string
	}
}

export const WorkflowSettingsModal: React.FC<WorkflowSettingsModalProps> = ({ visible, onClose, onSave, settings }) => {
	const [form] = Form.useForm()

	React.useEffect(() => {
		if (visible) {
			form.setFieldsValue({
				title: settings.title || '',
				description: settings.description || '',
				name: settings.name || '',
			})
		}
	}, [visible, settings, form])

	const handleSave = async () => {
		try {
			const values = await form.validateFields()
			onSave(values)
			onClose()
		} catch (error) {
			console.error('Validation failed:', error)
		}
	}

	return (
		<Modal
			title="Основные настройки воркфлоу"
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
						Сохранить
					</Button>
				</div>
			}
		>
			<Form form={form} layout="vertical" className="formSection">
				<Row gutter={[16, 16]}>
					<Col span={24}>
						<Form.Item
							name="title"
							label="Название (Title)"
							rules={[{ required: true, message: 'Введите название воркфлоу' }]}
						>
							<Input placeholder="Название воркфлоу для отображения" />
						</Form.Item>
					</Col>
					<Col span={24}>
						<Form.Item
							name="name"
							label="Идентификатор (Name)"
							rules={[
								{ required: true, message: 'Введите идентификатор' },
								{ pattern: /^[a-z0-9-]+$/, message: 'Только маленькие латинские буквы, цифры и дефисы' },
							]}
						>
							<Input placeholder="workflow-name" />
						</Form.Item>
					</Col>
					<Col span={24}>
						<Form.Item name="description" label="Описание">
							<TextArea rows={4} placeholder="Описание воркфлоу" />
						</Form.Item>
					</Col>
				</Row>
			</Form>
		</Modal>
	)
}

export default WorkflowSettingsModal
