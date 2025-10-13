import { Button, Form, Input, Modal, Space } from "antd";
import React from "react";

interface WorkflowSettingsModalProps {
	visible: boolean;
	onClose: () => void;
	onSave: (settings: {
		title: string;
		description: string;
		name: string;
	}) => void;
	settings: {
		title: string;
		description: string;
		name: string;
	};
}

export const WorkflowSettingsModal: React.FC<WorkflowSettingsModalProps> = ({
	visible,
	onClose,
	onSave,
	settings,
}) => {
	const [form] = Form.useForm();

	React.useEffect(() => {
		if (visible) {
			form.setFieldsValue({
				title: settings.title || "",
				description: settings.description || "",
				name: settings.name || "",
			});
		}
	}, [visible, settings, form]);

	const handleSave = async () => {
		try {
			const values = await form.validateFields();
			onSave(values);
			onClose();
		} catch (error) {
			console.error("Validation failed:", error);
		}
	};

	return (
		<Modal
			title="Основные настройки воркфлоу"
			open={visible}
			onCancel={onClose}
			width={600}
			centered
			destroyOnHidden
			maskClosable={false}
			footer={
				<Space>
					<Button onClick={onClose}>Отмена</Button>
					<Button type="primary" onClick={handleSave}>
						Сохранить
					</Button>
				</Space>
			}
		>
			<Form
				form={form}
				layout="vertical"
				variant="filled"
				requiredMark="optional"
			>
				<Form.Item
					name="title"
					label="Название воркфлоу"
					rules={[{ required: true, message: "Введите название" }]}
				>
					<Input placeholder="Название воркфлоу" />
				</Form.Item>

				<Form.Item
					name="name"
					label="Системное имя"
					rules={[{ required: true, message: "Введите системное имя" }]}
				>
					<Input placeholder="workflow-name" />
				</Form.Item>

				<Form.Item name="description" label="Описание">
					<Input.TextArea rows={4} placeholder="Описание воркфлоу" />
				</Form.Item>
			</Form>
		</Modal>
	);
};

export default WorkflowSettingsModal;
