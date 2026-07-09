import { Button, Col, Form, Input, Modal, Row, Space } from "antd";
import React from "react";

const { TextArea } = Input;

interface StepEditModalProps {
	visible: boolean;
	onClose: () => void;
	onSave: (step: any) => void;
	step: any;
	isNew: boolean;
}

export const StepEditModal: React.FC<StepEditModalProps> = ({
	visible,
	onClose,
	onSave,
	step,
	isNew,
}) => {
	const [form] = Form.useForm();

	React.useEffect(() => {
		if (visible) {
			form.setFieldsValue({
				title: step?.title || "",
				name: step?.name || "",
				description: step?.description || "",
			});
		}
	}, [visible, step, form]);

	const handleSave = async () => {
		try {
			const values = await form.validateFields();
			onSave(values);
			onClose();
		} catch (error) {
			console.error("Validation failed:", error);
		}
	};

	const handleClose = () => {
		form.resetFields();
		onClose();
	};

	return (
		<Modal
			title={isNew ? "New step" : "Edit step"}
			open={visible}
			onCancel={handleClose}
			width={800}
			centered
			destroyOnHidden
			mask={{ closable: false }}
			footer={
				<Space>
					<Button onClick={handleClose}>Cancel</Button>
					<Button type="primary" onClick={handleSave}>
						{isNew ? "Create" : "Save"}
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
				<Row gutter={[16, 16]}>
					<Col xs={24} lg={12}>
						<Form.Item
							name="title"
							label="Step name"
							rules={[{ required: true, message: "Enter a name" }]}
						>
							<Input placeholder="Step name" />
						</Form.Item>
					</Col>
					<Col xs={24} lg={12}>
						<Form.Item
							name="name"
							label="Step identifier"
							rules={[
								{ required: true, message: "Enter an identifier" },
								{
									pattern: /^[a-z0-9-]+$/,
									message: "Only lowercase latin letters, digits and dashes",
								},
							]}
						>
							<Input placeholder="step-name" />
						</Form.Item>
					</Col>
					<Col span={24}>
						<Form.Item name="description" label="Step description">
							<TextArea rows={3} placeholder="Step description" />
						</Form.Item>
					</Col>
				</Row>
			</Form>
		</Modal>
	);
};

export default StepEditModal;
