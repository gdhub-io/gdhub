import type {
	Project,
	ProjectWorkflow,
	ProjectWorkflowStep,
} from "@gdhub-io/gdhub-prisma";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import { TbInfoCircle } from "@react-icons/all-files/tb/TbInfoCircle";
import { TbTrash } from "@react-icons/all-files/tb/TbTrash";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Col,
	Flex,
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
import ReactPlayer from "react-player";
import { ProjectStatus } from "@/config/prisma-enums";
import { normUploadFile } from "@/helpers/file";
import { getVideoPoster, toPlayableVideoUrl } from "@/helpers/video";
import styles from "./style.module.scss";
import "@mdxeditor/editor/style.css";

const ContentEditor = dynamic(() => import("@/components/ContentEditor"), {
	ssr: false,
});

const PITCH_VIDEO_DOCS_URL =
	"https://docs.gdhub.io/how-to-pitch-your-project-and-attract-talent";

type GeneralProjectFormArgs = {
	projectSlug: string;
};

const GeneralProjectForm = ({ projectSlug }: GeneralProjectFormArgs) => {
	const { t } = useTranslate();
	const [form] = Form.useForm();
	const editorRef = useRef<MDXEditorMethods | null>(null);
	const [cover, setCover] = useState<string | null>();
	const [description, setDescription] = useState("");
	const [coverProcessing, setCoverProcessing] = useState(false);
	const [videoUrl, setVideoUrl] = useState<string | null>();

	const { data: project, isFetching } = useQuery({
		queryKey: ["project", projectSlug],
		queryFn: () =>
			axios.get<
				Project & {
					workflow: ProjectWorkflow & {
						steps: ProjectWorkflowStep[];
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

			const playable = toPlayableVideoUrl(project.data.videoLink);
			setVideoUrl(ReactPlayer.canPlay?.(playable) ? playable : undefined);
		}
	}, [project?.data]);
	const isProjectArchived = project?.data.status === ProjectStatus.Archived;

	const { mutateAsync: updateProject, isPending: isUpdating } = useMutation({
		mutationFn: (data: any) =>
			axios.put<Project>("/api/user/project", data, {
				params: { id: project?.data.id },
			}),
	});

	useEffect(() => {
		if (projectSlug) {
			setCover(undefined);
			setDescription("");
			setVideoUrl(undefined);
		}
	}, []);

	useEffect(() => {
		if (project) {
			form.setFieldsValue({ ...project.data });
			setDescription(project.data?.description || "");
		}
	}, [project]);

	const handleOk = async () => {
		if (isProjectArchived) return;

		try {
			const formData = await form.validateFields();
			const payload: Record<string, unknown> = {
				...formData,
				description: formData.description?.trim(),
				coverImage: cover ? cover : null,
			};

			if (project?.data.status === ProjectStatus.Approved) {
				payload.videoLink = videoUrl ? videoUrl : null;
			}

			await updateProject(payload);

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
		disabled: isProjectArchived,
		className: styles.coverUploadDragger,
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
		if (isProjectArchived) return;
		if (!cover) return;

		setCoverProcessing(true);
		await removeImage(cover);
		setCoverProcessing(false);

		form.setFieldValue("coverImage", undefined);
		setCover(undefined);
	};

	// As soon as a playable video URL is entered, embed it in place.
	const handleVideoInput = (value: string) => {
		const url = value.trim();

		if (ReactPlayer.canPlay?.(url)) {
			form.setFieldValue("videoLink", url);
			setVideoUrl(url);
		}
	};

	const handleVideoRemove = () => {
		if (isProjectArchived) return;

		form.setFieldValue("videoLink", undefined);
		setVideoUrl(undefined);
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
				disabled={isProjectArchived}
			>
				<Row gutter={[24, 24]} align="stretch">
					<Col xs={24} md={12} lg={8} className={styles.mediaCol}>
						<div className={styles.boxCaption}>
							{t(
								"page.my.projects.settings.coverImage.label",
								"Cover for the project",
							)}
						</div>
						{!cover ? (
							<Form.Item
								wrapperCol={{ xs: 12 }}
								name="coverImage"
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
											disabled={isProjectArchived}
											onClick={handleCoverDelete}
											icon={<TbTrash size={18} style={{ marginTop: 2 }} />}
										/>
									</Popover>
								</div>
							</Spin>
						)}
					</Col>
					{project?.data.status === ProjectStatus.Approved && (
						<Col xs={24} md={12} lg={8} className={styles.mediaCol}>
							<Flex
								justify="space-between"
								align="center"
								gap={8}
								className={styles.boxCaption}
							>
								<span>
									{t(
										"page.my.projects.settings.videoLink.label",
										"Pitch or gameplay video",
									)}
								</span>
								<a
									href={PITCH_VIDEO_DOCS_URL}
									target="_blank"
									rel="noopener noreferrer"
									className={styles.videoDocsLink}
								>
									<TbInfoCircle size={15} />
									{t(
										"page.my.projects.settings.videoLink.docs",
										"How to prepare",
									)}
								</a>
							</Flex>
							<div
								className={`${styles.videoBox} ${
									videoUrl ? styles.videoBoxFilled : ""
								}`}
							>
								{videoUrl ? (
									<div className={styles.videoPreview}>
										<div className={styles.videoPreviewPlayer}>
											<ReactPlayer
												src={videoUrl}
												light={getVideoPoster(videoUrl) || true}
												controls
												width="100%"
												height="100%"
											/>
										</div>
										<Popover
											content={t(
												"page.my.projects.settings.videoLink.deletePopover",
												"Remove pitch video",
											)}
										>
											<Button
												shape="circle"
												type="primary"
												className="remove-cover-btn"
												disabled={isProjectArchived}
												onClick={handleVideoRemove}
												icon={<TbTrash size={18} style={{ marginTop: 2 }} />}
											/>
										</Popover>
									</div>
								) : (
									<Form.Item
										className={styles.videoFormItem}
										name="videoLink"
										wrapperCol={{ span: 24 }}
										extra={
											<span className={styles.videoServices}>
												{t(
													"page.my.projects.settings.videoLink.services",
													"YouTube, Vimeo, Twitch, TikTok, Wistia and more",
												)}
											</span>
										}
										rules={[
											{
												validator: (_, value) => {
													if (!value) return Promise.resolve();

													if (ReactPlayer.canPlay?.(value.trim())) {
														return Promise.resolve();
													}

													return Promise.reject(
														t(
															"page.my.projects.settings.videoLink.error",
															"Paste a valid video link (YouTube, Vimeo, Twitch, …)",
														),
													);
												},
											},
										]}
									>
										<Input
											width={"100%"}
											placeholder={t(
												"page.my.projects.settings.videoLink.placeholder",
												"https://youtube.com/watch?v=…",
											)}
											onChange={(e) => handleVideoInput(e.target.value)}
											onPressEnter={(e) =>
												handleVideoInput((e.target as HTMLInputElement).value)
											}
										/>
									</Form.Item>
								)}
							</div>
						</Col>
					)}
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

				<Form.Item
					name="genre"
					label={t("page.my.projects.settings.genre.label", "Genre")}
					tooltip={{
						title: t(
							"page.my.projects.settings.genre.tooltip",
							"The gameplay genre your project belongs to. You can combine several.",
						),
						icon: <TbInfoCircle size={15} />,
					}}
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
					tooltip={{
						title: t(
							"page.my.projects.settings.setting.tooltip",
							"The world, theme and atmosphere of the game (e.g. post-apocalyptic, fantasy).",
						),
						icon: <TbInfoCircle size={15} />,
					}}
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
					tooltip={{
						title: t(
							"page.my.projects.settings.visualStyle.tooltip",
							"The art style and visual references (e.g. low poly, similar to Brawl Stars).",
						),
						icon: <TbInfoCircle size={15} />,
					}}
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
					tooltip={{
						title: t(
							"page.my.projects.settings.audition.tooltip",
							"The players you target by their interests and tastes — what they enjoy (e.g. people who love cooking).",
						),
						icon: <TbInfoCircle size={15} />,
					}}
					wrapperCol={{ span: 24 }}
					rules={[{ required: true }]}
					required
				>
					<Input
						width={"100%"}
						placeholder={t(
							"page.my.projects.settings.audition.placeholder",
							"Example: people who love cooking games",
						)}
					/>
				</Form.Item>
			</Form>

			<Button
				type="primary"
				onClick={handleOk}
				loading={isUpdating}
				disabled={isProjectArchived}
			>
				{t("page.my.projects.settings.button.save", "Save")}
			</Button>
		</Spin>
	);
};

export default GeneralProjectForm;
