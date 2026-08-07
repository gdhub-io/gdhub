import { Button, Form, Input, Modal, Space } from "antd";
import React from "react";
import styles from "./TaskEditModal.module.scss";

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
			<Form form={form} layout="vertical" variant="filled" requiredMark={false}>
				<Form.Item
					name="title"
					label="Workflow title"
					rules={[{ required: true, message: "Enter a title" }]}
				>
					<Input placeholder="Indie game launch" />
				</Form.Item>

				<Form.Item
					name="name"
					label="System name"
					extra="Used by the API and by task conditions."
					rules={[
						{ required: true, message: "Enter a system name" },
						{
							pattern: /^[a-z0-9-]+$/,
							message: "Lowercase letters, digits and dashes only",
						},
					]}
				>
					<Input placeholder="indie-game-launch" />
				</Form.Item>

				<Form.Item
					name="description"
					label={
						<>
							Description&nbsp;
							<span className={styles.optional}>(optional)</span>
						</>
					}
				>
					<Input.TextArea
						rows={4}
						placeholder="A step-by-step path from a raw concept to a published indie game."
					/>
				</Form.Item>
			</Form>
		</Modal>
	);
};

export default WorkflowSettingsModal;
