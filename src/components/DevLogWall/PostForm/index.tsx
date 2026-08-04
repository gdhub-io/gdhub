import type { ProjectReport } from "@gdhub-io/gdhub-prisma";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import { AiOutlineVideoCameraAdd } from "@react-icons/all-files/ai/AiOutlineVideoCameraAdd";
import { IoMdClose } from "@react-icons/all-files/io/IoMdClose";
import { useMutation } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Card,
	Flex,
	Form,
	Input,
	message,
	notification,
	Space,
	Tooltip,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import { useRef, useState } from "react";
import { gtmEventTrigger } from "@/helpers/gtm";
import "@mdxeditor/editor/style.css";
import dynamic from "next/dynamic";

const ContentEditor = dynamic(() => import("@/components/ContentEditor"), {
	ssr: false,
});

export const PostForm = ({ projectId, onCreate = () => {} }: any) => {
	const [form] = Form.useForm();
	const { t } = useTranslate();
	const [content, setContent] = useState("");
	const [showAddVideoInput, setShowAddVideoInput] = useState(false);
	const editorRef = useRef<MDXEditorMethods | null>(null);

	const { mutateAsync: createProjectReport, isPending: isLoading } =
		useMutation({
			mutationFn: (data: Omit<Partial<ProjectReport>, "id">) =>
				axios.post<void>("/api/user/project/report", data),
			onSuccess: () => {
				onCreate();
				gtmEventTrigger("devlog_create", { projectId });
			},
		});

	const handleOk = async () => {
		try {
			const { content, video, projectId } = await form.validateFields();

			if (!content?.length) {
				message.warning(t("The post can not be empty"));
				return;
			}

			await createProjectReport({
				projectId,
				content,
				video,
				publishedAt: dayjs().toDate(),
			});

			form.resetFields();
			setShowAddVideoInput(false);
		} catch (error: any) {
			if (!Object.hasOwn(error, "errorFields")) {
				message.error(error.message);
			} else {
				message.error(
					t(
						"form.message.incorrect",
						"Error. Check if all data is entered correctly",
					),
				);
			}
		}
	};

	return (
		<Card>
			<Form
				form={form}
				variant="filled"
				layout="vertical"
				name="report-form"
				wrapperCol={{ span: 12 }}
				onFinish={() => {}}
				onFinishFailed={() => {}}
				autoComplete="off"
				requiredMark="optional"
				initialValues={{
					projectId,
					publishedAt: dayjs(),
				}}
			>
				<Form.Item name="projectId" rules={[{ required: true }]} noStyle hidden>
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
						<Flex justify="space-between">
							<Tooltip title={t("devlogwall.form.add-video", "Add video")}>
								<Button
									onClick={() => setShowAddVideoInput(true)}
									icon={<AiOutlineVideoCameraAdd size={24} />}
									type="text"
								></Button>
							</Tooltip>

							<Button type="primary" onClick={handleOk} loading={isLoading}>
								{t("modal.devlogwall.newpost.postBtn.label", "Post")}
							</Button>
						</Flex>
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
							<Flex justify="end">
								<Button type="primary" onClick={handleOk} loading={isLoading}>
									{t("modal.devlogwall.newpost.postBtn.label", "Post")}
								</Button>
							</Flex>
						</>
					)}
				</Space>
			</Form>
		</Card>
	);
};
