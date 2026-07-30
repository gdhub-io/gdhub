import type { Event, EventScheduleItem } from "@gdhub-io/gdhub-prisma";
import { TbTrash } from "@react-icons/all-files/tb/TbTrash";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Col,
	Form,
	Grid,
	Input,
	message,
	Popover,
	Row,
	Select,
	Spin,
	Upload,
	type UploadProps,
} from "antd";
import axios from "axios";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { EventType, Language } from "@/config/prisma-enums";
import styles from "./style.module.scss";
import "@mdxeditor/editor/style.css";
import ImgCrop from "antd-img-crop";

type GeneralProjectFormArgs = {
	eventId: string;
};

const GeneralProjectForm = ({ eventId }: GeneralProjectFormArgs) => {
	const { t } = useTranslate();
	const [form] = Form.useForm();
	const screens = Grid.useBreakpoint();
	const [cover, setCover] = useState<string | null>();
	const [coverProcessing, setCoverProcessing] = useState(false);

	const { data: event, isFetching } = useQuery({
		queryKey: ["event", eventId],
		queryFn: () =>
			axios.get<
				Event & {
					schedule: EventScheduleItem[];
				}
			>(`/api/user/event/${eventId}`),
		enabled: !!eventId,
		refetchOnWindowFocus: false,
		refetchInterval: false,
	});

	const isBigEvent = useMemo(() => {
		return (
			event?.data?.type === EventType.GameLab ||
			event?.data?.type === EventType.Conference
		);
	}, [event?.data?.type]);

	useEffect(() => {
		if (event?.data) {
			setCover(event.data.image);
		}
	}, [event?.data]);

	const { mutateAsync: updateEvent, isPending: isUpdating } = useMutation({
		mutationFn: (data: Partial<Event>) =>
			axios.put<Event>(`/api/user/event/${eventId}`, data),
	});

	useEffect(() => {
		if (event) {
			form.setFieldsValue({
				...event.data,
			});
		}
	}, [event, form]);

	const handleOk = async () => {
		try {
			const formData = await form.validateFields();
			await updateEvent({
				...formData,
				image: cover ? cover : null,
			});

			message.success(
				eventId ? t("Event data updated") : t("Added a new event"),
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

	const uploadImage = async (file: File) => {
		try {
			const data = new FormData();
			data.append("file", file);
			data.append("filename", `event-cover-${eventId}`);
			data.append("tag", "event-cover");

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
			if (eventId) {
				await updateEvent({ image: null });
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

			if (status === "done" && info.file.originFileObj) {
				const uploadedFileData = await uploadImage(info.file.originFileObj);
				setCover(uploadedFileData.url);

				form.setFieldValue("image", uploadedFileData.url);

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
			form.setFieldValue("image", uploadedFileData.url);
			setCoverProcessing(false);
		},
	};

	const handleCoverDelete = async () => {
		if (!cover) return;

		setCoverProcessing(true);
		await removeImage(cover);
		setCoverProcessing(false);

		form.setFieldValue("image", undefined);
		setCover(undefined);
	};

	return (
		<Spin spinning={isFetching || isUpdating}>
			<Form
				form={form}
				variant="filled"
				layout="vertical"
				initialValues={{ ...event?.data }}
				requiredMark="optional"
			>
				<Row gutter={[16, 16]}>
					{isBigEvent ? (
						<Col span={24} style={{ marginBottom: 24 }}>
							{!cover ? (
								<Form.Item
									label={t("event.modal.image", "Image")}
									name="image"
									valuePropName="image"
									noStyle
								>
									<ImgCrop aspect={16 / 9} cropShape="rect" showGrid showReset>
										<Upload.Dragger
											{...uploadProps}
											className={styles.cover}
											style={{
												aspectRatio: "16 / 9",
												width: "100%",
												maxHeight: 500,
											}}
										>
											<p className="ant-upload-text">
												{t("event.modal.image.add", "Add event image")}
											</p>
											<p className="ant-upload-hint">
												{t(
													"event.modal.image.hint",
													"Click or drag image here. JPG, PNG. 16:9 recommended.",
												)}
											</p>
										</Upload.Dragger>
									</ImgCrop>
								</Form.Item>
							) : (
								<Spin spinning={coverProcessing}>
									<div
										className={styles.cover}
										style={{ aspectRatio: "16 / 9" }}
									>
										<Image src={cover + "?w=1200"} fill alt="" />
										<Popover
											content={t(
												"event.modal.image.deletePopover",
												"Remove image",
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
					) : null}

					<Col span={isBigEvent || !screens.md ? 24 : 8}>
						{!isBigEvent &&
							(!cover ? (
								<Form.Item
									label={t("event.modal.image", "Image")}
									name="image"
									valuePropName="image"
									noStyle
								>
									<ImgCrop aspect={4 / 5} cropShape="rect" showGrid showReset>
										<Upload.Dragger
											{...uploadProps}
											className={styles.cover}
											style={{ aspectRatio: "4 / 5", maxHeight: 500 }}
										>
											<p className="ant-upload-text">
												{t("event.modal.image.add", "Add event image")}
											</p>
											<p className="ant-upload-hint">
												{t(
													"event.modal.image.hint",
													"Click or drag image here. JPG, PNG. 4:5 recommended.",
												)}
											</p>
										</Upload.Dragger>
									</ImgCrop>
								</Form.Item>
							) : (
								<Spin spinning={coverProcessing}>
									<div
										className={styles.cover}
										style={{ aspectRatio: "4 / 5" }}
									>
										<Image src={cover + "?w=750"} fill alt="" />
										<Popover
											content={t(
												"event.modal.image.deletePopover",
												"Remove image",
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
							))}
					</Col>
					<Col span={isBigEvent || !screens.md ? 24 : 16}>
						<Form.Item
							label={t("event.modal.title.label", "Title")}
							name="title"
							rules={[
								{
									required: true,
									message: t("event.modal.title.required", "Title is required"),
								},
							]}
						>
							<Input
								placeholder={t("event.modal.title.placeholder", "Event title")}
							/>
						</Form.Item>
						<Form.Item
							label={t(
								"event.modal.shortDescription.label",
								"Short Description",
							)}
							name="shortDescription"
						>
							<Input.TextArea
								rows={2}
								maxLength={90}
								showCount
								autoSize={{ minRows: 2, maxRows: 3 }}
								placeholder={t(
									"event.modal.shortDescription.placeholder",
									"Event short description",
								)}
							/>
						</Form.Item>

						<Form.Item
							label={t("event.modal.language", "Language")}
							name="lang"
							rules={[
								{
									required: true,
									message: t(
										"event.modal.language.required",
										"Language is required",
									),
								},
							]}
						>
							{
								<Select
									options={[
										...Object.values(Language).map((lang) => ({
											label: lang,
											value: lang,
										})),
									]}
								/>
							}
						</Form.Item>

						<Form.Item
							label={t("event.modal.link", "Registration Link")}
							name="url"
							help={t(
								"event.modal.link.help",
								"The link to the external event registration page. Leave blank if you want use internal registration.",
							)}
						>
							<Input
								placeholder={t("event.modal.link.placeholder", "https://")}
							/>
						</Form.Item>
					</Col>
				</Row>
			</Form>

			<Button
				type="primary"
				onClick={handleOk}
				loading={isUpdating}
				style={{ marginTop: 16 }}
			>
				{t("page.my.projects.settings.button.save", "Save")}
			</Button>
		</Spin>
	);
};

export default GeneralProjectForm;
