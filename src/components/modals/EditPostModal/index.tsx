import type { ProjectReport } from "@gdhub-io/gdhub-prisma";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import { AiOutlineVideoCameraAdd } from "@react-icons/all-files/ai/AiOutlineVideoCameraAdd";
import { IoMdClose } from "@react-icons/all-files/io/IoMdClose";
import { TbTrash } from "@react-icons/all-files/tb/TbTrash";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Flex,
	Form,
	Input,
	Modal,
	message,
	notification,
	Popconfirm,
	Space,
	Spin,
	Tooltip,
} from "antd";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import ContentEditor from "@/components/ContentEditor";

const EditPostModal = ({ open, postId, onUpdate, onCancel }: any) => {
	const [form] = Form.useForm();
	const { t } = useTranslate();
	const [showAddVideoInput, setShowAddVideoInput] = useState(false);
	const editorRef = useRef<MDXEditorMethods | null>(null);
	const [content, setContent] = useState("");

	const { data: report, isLoading } = useQuery({
		queryKey: ["project-report", postId],
		queryFn: () =>
			axios.get<ProjectReport>("/api/user/project/report", {
				params: { id: postId },
			}),
		enabled: !!postId,
	});

	const { mutateAsync: editProjectReport, isPending: isUpdating } = useMutation(
		{
			mutationFn: (data) => axios.put<void>("/api/user/project/report", data),
		},
	);

	useEffect(() => {
		if (!report?.data) return;

		setShowAddVideoInput(!!report?.data.video);
		setContent(report?.data.content || "");

		form.setFieldsValue({
			id: report?.data.id,
			content: report?.data.content,
			video: report?.data.video,
		});
	}, [report?.data]);

	const handleOk = async () => {
		try {
			const data = await form.validateFields();

			await editProjectReport(data);

			onUpdate();
		} catch (error: any) {
			console.error("error", error);
			if (!Object.hasOwn(error, "errorFields")) {
				message.error(error.message);
			} else {
				message.error("Error. Check if all form data is entered correctly");
			}
		}
	};

	const handleCancel = () => {
		form.resetFields();
		onCancel();
	};

	const { mutateAsync: deleteProjectReport } = useMutation({
		mutationFn: (params: { id: string }) =>
			axios.delete<void>("/api/user/project/report", { params }),
	});

	const handleDeleteReport = async (id: string) => {
		form.resetFields();
		setContent("");
		setShowAddVideoInput(false);

		await deleteProjectReport({ id });

		message.success(t("Report was deleted"));

		onUpdate();
	};

	return (
		<Modal
			centered
			title={t("modal.edit-devlog-post.title", "Edit post")}
			width={640}
			destroyOnHidden
			mask={{ closable: false }}
			okText={t("modal.edit-devlog-post.save", "Save")}
			cancelText={t("modal.edit-devlog-post.cancel", "Cancel")}
			open={open}
			onOk={handleOk}
			onCancel={handleCancel}
			confirmLoading={isUpdating}
			footer={
				<Flex justify="space-between">
					<Popconfirm
						key={postId}
						title={t("You definitely want to delete this report?")}
						okText={t("modal.edit-devlog-post.yes", "Yes")}
						cancelText={t("modal.edit-devlog-post.no", "No")}
						onConfirm={() => handleDeleteReport(postId)}
					>
						<Button
							icon={<TbTrash size={24} />}
							type="text"
							danger
							style={{ lineHeight: "initial" }}
						/>
					</Popconfirm>
					<Space size={4}>
						<Button onClick={handleCancel}>
							{t("modal.edit-devlog-post.cancel", "Cancel")}
						</Button>
						<Button type="primary" onClick={handleOk}>
							{t("modal.edit-devlog-post.save", "Save")}
						</Button>
					</Space>
				</Flex>
			}
		>
			<Spin spinning={isLoading || isUpdating}>
				<Form
					form={form}
					variant="filled"
					layout="vertical"
					wrapperCol={{ span: 12 }}
					onFinish={() => {}}
					onFinishFailed={() => {}}
					autoComplete="off"
					requiredMark="optional"
				>
					<Form.Item name="id" rules={[{ required: true }]} noStyle hidden>
						<Input />
					</Form.Item>

					<Space orientation="vertical" style={{ width: "100%" }}>
						<Form.Item
							name="content"
							label={t(
								"modal.devlogwall.newpost.label",
								"What&apos;s new in the project?",
							)}
							required
							style={{ margin: 0 }}
							rules={[
								{
									validator: () => {
										const value = editorRef.current?.getMarkdown();
										if (!value) {
											notification.error({
												message: t(
													"modal.devlogwall.newpost.required",
													"This field is required",
												),
											});
										}
										return value ? Promise.resolve() : Promise.reject();
									},
								},
							]}
							wrapperCol={{ span: 24 }}
						>
							<ContentEditor
								editorRef={editorRef as any}
								markdown={content}
								onChange={(text: string) => form.setFieldValue("content", text)}
							/>
						</Form.Item>

						{!showAddVideoInput && (
							<Tooltip title={t("devlogwall.form.add-video", "Add video")}>
								<Button
									className="gray-text-btn"
									onClick={() => setShowAddVideoInput(true)}
									icon={<AiOutlineVideoCameraAdd size={24} />}
									type="text"
								></Button>
							</Tooltip>
						)}

						{!!showAddVideoInput && (
							<>
								<Flex gap={16} align="center">
									<Form.Item
										name="video"
										wrapperCol={{ span: 24 }}
										style={{ margin: 0, width: "100%" }}
									>
										<Input placeholder={t("Insert video url")} />
									</Form.Item>
									<Button
										type="text"
										onClick={() => setShowAddVideoInput(false)}
										style={{ paddingInline: 8 }}
									>
										<IoMdClose />
									</Button>
								</Flex>
							</>
						)}
					</Space>
				</Form>
			</Spin>
		</Modal>
	);
};

export default EditPostModal;
