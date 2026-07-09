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
			title="Workflow settings"
			open={visible}
			onCancel={onClose}
			width={600}
			centered
			destroyOnHidden
			mask={{ closable: false }}
			footer={
				<Space>
					<Button onClick={onClose}>Cancel</Button>
					<Button type="primary" onClick={handleSave}>
						Save
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
					label="Workflow title"
					rules={[{ required: true, message: "Enter a title" }]}
				>
					<Input placeholder="Workflow title" />
				</Form.Item>

				<Form.Item
					name="name"
					label="System name"
					rules={[{ required: true, message: "Enter a system name" }]}
				>
					<Input placeholder="workflow-name" />
				</Form.Item>

				<Form.Item name="description" label="Description">
					<Input.TextArea rows={4} placeholder="Workflow description" />
				</Form.Item>
			</Form>
		</Modal>
	);
};

export default WorkflowSettingsModal;
