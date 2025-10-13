import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import { TbTrash } from "@react-icons/all-files/tb/TbTrash";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Col,
	Form,
	Input,
	message,
	Popover,
	Row,
	Spin,
	Upload,
	type UploadProps,
} from "antd";
import axios from "axios";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { normUploadFile } from "@/helpers/file";
import styles from "./style.module.scss";
import "@mdxeditor/editor/style.css";

const ContentEditor = dynamic(() => import("@/components/ContentEditor"), {
	ssr: false,
});

type GeneralProjectFormArgs = {
	projectSlug: string;
};

const GeneralProjectForm = ({ projectSlug }: GeneralProjectFormArgs) => {
	const { t } = useTranslate();
	const [form] = Form.useForm();
	const editorRef = useRef<MDXEditorMethods | null>();
	const [cover, setCover] = useState<string | null>();
	const [description, setDescription] = useState("");
	const [coverProcessing, setCoverProcessing] = useState(false);

	const { data: project, isFetching } = useQuery({
		queryKey: ["project", projectSlug],
		queryFn: () =>
			axios.get<
				prismaClient.Project & {
					workflow: prismaClient.ProjectWorkflow & {
						steps: prismaClient.ProjectWorkflowStep[];
					};
				}
			>("/api/user/project", {
				params: { slug: projectSlug },
			}),
		enabled: !!projectSlug,
		refetchOnWindowFocus: false,
		refetchInterval: false,
	});

	useEffect(() => {
		if (project?.data) {
			setCover(project.data.coverImage);
			setDescription(project.data.description || "");
		}
	}, [project?.data]);

	const { mutateAsync: updateProject, isPending: isUpdating } = useMutation({
		mutationFn: (data: any) =>
			axios.put<prismaClient.Project>("/api/user/project", data, {
				params: { id: project?.data.id },
			}),
	});

	useEffect(() => {
		if (projectSlug) {
			setCover(undefined);
			setDescription("");
		}
	}, []);

	useEffect(() => {
		if (project) {
			form.setFieldsValue({ ...project.data });
			setDescription(project.data?.description || "");
		}
	}, [project]);

	const handleOk = async () => {
		try {
			const formData = await form.validateFields();
			await updateProject({
				...formData,
				description: formData.description?.trim(),
				coverImage: cover ? cover : null,
			});

			message.success(
				projectSlug ? t("Project data updated") : t("Added a new game project"),
			);
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

	const uploadImage = async (file: any) => {
		try {
			const data = new FormData();
			data.append("file", file);
			data.append("filename", "project-cover-" + projectSlug);
			data.append("tag", "project-cover");

			const res = await axios.post("/api/file", data);

			return await res.data;
		} catch (error) {
			console.error(error);
		}
	};

	const removeImage = async (fileUrl: string) => {
		try {
			const res = await axios.delete("/api/file", { params: { fileUrl } });

			// save
			if (projectSlug) {
				await updateProject({ coverImage: null });
			}

			return await res;
		} catch (error) {
			console.error(error);
		}
	};

	const uploadProps: UploadProps = {
		name: "files",
		multiple: false,
		accept: "image/png, image/jpeg",
		customRequest: ({ onSuccess }) =>
			setTimeout(() => {
				if (onSuccess) onSuccess("ok");
			}, 0),
		onChange: async (info) => {
			const { status } = info.file;

			setCoverProcessing(true);

			if (status === "done") {
				const uploadedFileData = await uploadImage(info.file.originFileObj);
				setCover(uploadedFileData.url);

				form.setFieldValue("coverImage", uploadedFileData.url);

				message.success(`${info.file.name} file uploaded successfully.`);
			} else if (status === "error") {
				message.error(`${info.file.name} file upload failed.`);
			}

			setCoverProcessing(false);
		},
		onDrop: async (e) => {
			setCoverProcessing(true);

			const uploadedFileData = await uploadImage(e.dataTransfer.files[0]);
			setCover(uploadedFileData.url);
			setCoverProcessing(false);
		},
	};

	const handleCoverDelete = async () => {
		if (!cover) return;

		setCoverProcessing(true);
		await removeImage(cover);
		setCoverProcessing(false);

		form.setFieldValue("coverImage", undefined);
		setCover(undefined);
	};

	return (
		<Spin spinning={isFetching || isUpdating}>
			<Form
				form={form}
				layout="vertical"
				variant="filled"
				className={styles.form}
				name="profile-speciality-form"
				wrapperCol={{ span: 12 }}
				onFinish={() => {}}
				onFinishFailed={() => {}}
				autoComplete="off"
				requiredMark="optional"
			>
				<Row>
					<Col xs={24} md={12} lg={8}>
						{!cover ? (
							<Form.Item
								wrapperCol={{ xs: 12 }}
								name="coverImage"
								label={t(
									"page.my.projects.settings.coverImage.label",
									"Cover for the project",
								)}
								valuePropName="file"
								getValueFromEvent={normUploadFile}
								noStyle
							>
								<Upload.Dragger {...uploadProps}>
									<p className="ant-upload-text">
										{t(
											"page.my.projects.settings.coverImage.text",
											"Add a project cover",
										)}
									</p>
									<p className="ant-upload-hint">
										{t(
											"page.my.projects.settings.coverImage.hint",
											"To upload an image, click or drag it into this field.",
										)}
										<br />
										{t(
											"page.my.projects.settings.coverImage.hint",
											"Files in jpg, png formats are allowed. Aspect ratio 16/9. For example, the size is 1920x1080px.",
										)}
									</p>
								</Upload.Dragger>
							</Form.Item>
						) : (
							<Spin spinning={coverProcessing}>
								<div className={styles.cover}>
									<Image src={cover + "?w=750"} fill alt="" />
									<Popover
										content={t(
											"page.my.projects.settings.coverImage.deletePopover",
											"Remove project cover",
										)}
									>
										<Button
											shape="circle"
											type="primary"
											className="remove-cover-btn"
											onClick={handleCoverDelete}
											icon={<TbTrash size={18} style={{ marginTop: 2 }} />}
										/>
									</Popover>
								</div>
							</Spin>
						)}
					</Col>
				</Row>

				<Row gutter={[16, 0]} align="middle" style={{ marginTop: 30 }}>
					<Col flex={1} xs={{ span: 24 }} md={{ span: 16 }}>
						<Form.Item
							label={t("page.my.projects.settings.name.label", "Project Name")}
							name="name"
							rules={[{ required: true }]}
							required
							wrapperCol={{ span: 24 }}
						>
							<Input
								width={"100%"}
								placeholder={t(
									"page.my.projects.settings.name.placeholder",
									`Example: Hitman`,
								)}
								size="large"
							/>
						</Form.Item>
					</Col>
					<Col xs={{ span: 24 }} md={{ span: 8 }}>
						<Form.Item
							name="platform"
							label={t("page.my.projects.settings.platform.label", "Platform")}
							wrapperCol={{ span: 24 }}
							rules={[{ required: true }]}
							required
						>
							<Input
								width={"100%"}
								placeholder={t(
									"page.my.projects.settings.platform.placeholder",
									"Example: PC",
								)}
								size="large"
							/>
						</Form.Item>
					</Col>
				</Row>

				<Form.Item
					name="description"
					label={t(
						"page.my.projects.settings.description.label",
						"Short Description",
					)}
					required
					rules={[
						{
							validator: () => {
								const value = editorRef.current?.getMarkdown();

								if (!value) {
									return Promise.reject(
										t(
											"page.my.projects.settings.description.error",
											"This field is required",
										),
									);
								}

								return Promise.resolve();
							},
						},
					]}
					wrapperCol={{ span: 24 }}
				>
					<ContentEditor
						editorRef={editorRef as any}
						markdown={description}
						onChange={(text: string) => {
							form.setFieldValue("description", text);
							// setDescription(text)
						}}
					/>
				</Form.Item>

				{project?.data.status == prismaClient.ProjectStatus.Approved && (
					<>
						<Row gutter={[16, 16]}>
							<Col md={{ span: 16 }} sm={{ span: 12 }} xs={{ span: 24 }}>
								<Form.Item
									name="pitchdeckLink"
									label={t(
										"page.my.projects.settings.pitchdeckLink.label",
										"Link to presentation (to pitch)",
									)}
									wrapperCol={{ span: 24 }}
									rules={[{ type: "url" }]}
								>
									<Input width={"100%"} />
								</Form.Item>
							</Col>
							<Col md={{ span: 8 }} sm={{ span: 12 }} xs={{ span: 24 }}>
								<Form.Item
									name="videoLink"
									label={t(
										"page.my.projects.settings.videoLink.label",
										"Pitch video",
									)}
									wrapperCol={{ span: 24 }}
									rules={[{ max: 64, min: 4 }]}
								>
									<Input
										width={"100%"}
										placeholder={t(
											"page.my.projects.settings.videoLink.placeholder",
											"Specify video ID: ECxL-7DWVSE",
										)}
									/>
								</Form.Item>
							</Col>
						</Row>
					</>
				)}

				<Form.Item
					name="genre"
					label={t("page.my.projects.settings.genre.label", "Genre")}
					wrapperCol={{ span: 24 }}
					rules={[{ required: true }]}
					required
				>
					<Input
						width={"100%"}
						placeholder={t(
							"page.my.projects.settings.genre.placeholder",
							"Example: arcade idle + tower defense",
						)}
					/>
				</Form.Item>
				<Form.Item
					name="setting"
					label={t("page.my.projects.settings.setting.label", "Game Setting")}
					wrapperCol={{ span: 24 }}
					rules={[{ required: true }]}
					required
				>
					<Input
						width={"100%"}
						placeholder={t(
							"page.my.projects.settings.setting.placeholder",
							"Example: post-apocalyptic/zombie",
						)}
					/>
				</Form.Item>
				<Form.Item
					name="visualStyle"
					label={t(
						"page.my.projects.settings.visualStyle.label",
						"Visual Style",
					)}
					wrapperCol={{ span: 24 }}
					rules={[{ required: true }]}
					required
				>
					<Input
						width={"100%"}
						placeholder={t(
							"page.my.projects.settings.visualStyle.placeholder",
							"Example: low poly or something reminiscent of brawlstars",
						)}
					/>
				</Form.Item>
				<Form.Item
					name="audition"
					label={t("page.my.projects.settings.audition.label", "Audition")}
					wrapperCol={{ span: 24 }}
					rules={[{ required: true }]}
					required
				>
					<Input
						width={"100%"}
						placeholder={t(
							"page.my.projects.settings.audition.placeholder",
							"Example: men 16-45",
						)}
					/>
				</Form.Item>
			</Form>

			<Button type="primary" onClick={handleOk} loading={isUpdating}>
				{t("page.my.projects.settings.button.save", "Save")}
			</Button>
		</Spin>
	);
};

export default GeneralProjectForm;
