import { Button, Checkbox, Col, Form, Input, Modal, Row, Space } from "antd";
import React from "react";

const { TextArea } = Input;

interface TaskEditModalProps {
	visible: boolean;
	onClose: () => void;
	onSave: (task: any) => void;
	task: any;
	isNew: boolean;
}

export const TaskEditModal: React.FC<TaskEditModalProps> = ({
	visible,
	onClose,
	onSave,
	task,
	isNew,
}) => {
	const [form] = Form.useForm();

	React.useEffect(() => {
		if (visible) {
			form.setFieldsValue({
				title: task?.title || "",
				name: task?.name || "",
				description: task?.description || "",
				required: task?.required || false,
			});
		}
	}, [visible, task, form]);

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
			title={isNew ? "Новая задача" : "Редактировать задачу"}
			open={visible}
			onCancel={handleClose}
			width={600}
			centered
			destroyOnHidden
			maskClosable={false}
			footer={
				<Space>
					<Button onClick={handleClose}>Отмена</Button>
					<Button type="primary" onClick={handleSave}>
						{isNew ? "Создать" : "Сохранить"}
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
							label="Название задачи"
							rules={[{ required: true, message: "Введите название" }]}
						>
							<Input placeholder="Название задачи" />
						</Form.Item>
					</Col>
					<Col xs={24} lg={12}>
						<Form.Item
							name="name"
							label="Идентификатор задачи"
							rules={[
								{ required: true, message: "Введите идентификатор" },
								{
									pattern: /^[a-z0-9-]+$/,
									message: "Только маленькие латинские буквы, цифры и дефисы",
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
	);
};

export default TaskEditModal;
