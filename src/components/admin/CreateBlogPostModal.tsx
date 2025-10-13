import { useMutation } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Form, Input, Modal } from "antd";
import axios from "axios";

export const CreateBlogPostModal = ({
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

	const { mutateAsync: createPost, isPending } = useMutation({
		mutationFn: (values: { title: string }) => {
			return axios.post("/api/admin/post", values);
		},
		onSuccess: (data) => {
			onOk(data.data?.id);
		},
	});

	const handleOk = async () => {
		const values = form.getFieldsValue();
		await createPost(values);
	};

	return (
		<Modal
			centered
			okText={t("blog.create-post.modal.ok-text", "Create")}
			cancelText={t("blog.create-post.modal.cancel-text", "Cancel")}
			title={t("blog.create-post.modal.title", "Create blog post")}
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
								"blog.create-post.modal.title-required",
								"Title is required",
							),
						},
					]}
				>
					<Input
						placeholder={t("blog.create-post.modal.title-placeholder", "Title")}
					/>
				</Form.Item>
			</Form>
		</Modal>
	);
};
