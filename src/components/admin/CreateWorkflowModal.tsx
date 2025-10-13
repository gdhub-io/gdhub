import { useMutation } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Form, Input, Modal } from "antd";
import axios from "axios";

export const CreateWorkflowModal = ({
	open,
	onCancel,
	onOk,
}: {
	open: boolean;
	onCancel: () => void;
	onOk: (values: any) => void;
}) => {
	const { t } = useTranslate();
	const [form] = Form.useForm();

	const { mutateAsync: createWorkflow, isPending } = useMutation({
		mutationFn: (values: { title: string }) => {
			return axios.post("/api/admin/workflow", values);
		},
		onSuccess: (data) => {
			onOk(data.data?.id);
		},
	});

	const handleOk = async () => {
		const values = form.getFieldsValue();
		await createWorkflow(values);
	};

	return (
		<Modal
			centered
			okText={t("workflow.create-workflow.modal.ok-text", "Create")}
			cancelText={t("workflow.create-workflow.modal.cancel-text", "Cancel")}
			title={t("workflow.create-workflow.modal.title", "Create workflow")}
			open={open}
			onCancel={onCancel}
			onOk={handleOk}
			confirmLoading={isPending}
		>
			<Form
				form={form}
				onFinish={onOk}
				layout="vertical"
				requiredMark={false}
				variant="filled"
			>
				<Form.Item
					name="title"
					rules={[
						{
							required: true,
							message: t(
								"workflow.create-workflow.modal.title-required",
								"Title is required",
							),
						},
					]}
				>
					<Input
						placeholder={t(
							"workflow.create-workflow.modal.title-placeholder",
							"Title",
						)}
					/>
				</Form.Item>
			</Form>
		</Modal>
	);
};
