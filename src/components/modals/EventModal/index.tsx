import type { WorkDirection } from "@gdhub-io/gdhub-prisma";
import { FaRegCalendarCheck } from "@react-icons/all-files/fa/FaRegCalendarCheck";
import { TbTrash } from "@react-icons/all-files/tb/TbTrash";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTolgee } from "@tolgee/react";
import {
	Button,
	Col,
	DatePicker,
	type DraggerProps,
	Form,
	Input,
	Modal,
	message,
	Popover,
	Row,
	Select,
	Space,
	Spin,
	Upload,
} from "antd";
import ImgCrop from "antd-img-crop";
import axios from "axios";
import dayjs from "dayjs";
import Image from "next/image";
import { useSession } from "next-auth/react";
import type React from "react";
import { useEffect, useState } from "react";
import { useAccess } from "@/components/access/AccessProvider";
import { DirectionSelect } from "@/components/DirectionSelect";
import {
	EventFormat,
	EventType,
	Language,
	UserRole,
} from "@/config/prisma-enums";
import styles from "./style.module.scss";

const { RangePicker } = DatePicker;

interface EventModalProps {
	open: boolean;
	eventId?: string;
	eventType?: EventType;
	onCancel: () => void;
	onSubmit: () => void;
	initialValues?: any;
}

export type ScheduleItemFormValues = {
	id: string | null;
	title?: string;
	url?: string;
	startDate: string;
	endDate: string;
	speakers: { name: string; speciality: string; id: string }[];
	format?: EventFormat;
	language?: Language;
	directionId: string;
};

const EventModal: React.FC<EventModalProps> = ({
	open,
	eventType,
	onCancel,
	onSubmit,
	initialValues,
	eventId,
}) => {
	const [form] = Form.useForm();
	const { t } = useTolgee();
	const [imageUrl, setImageUrl] = useState<string | undefined>(
		initialValues?.image,
	);
	const { data: session } = useSession();
	const { isIn } = useAccess();
	// Staff may backdate an event; everyone else is limited to future dates.
	const isStaff = isIn("admin");
	const isBigEvent =
		eventType === EventType.GameLab || eventType === EventType.Conference;
	const [imageProcessing, setImageProcessing] = useState(false);
	const [fileList, setFileList] = useState<any[]>([]);

	const { data: eventData } = useQuery({
		queryKey: ["event", eventId],
		queryFn: () => axios.get(`/api/user/event/${eventId}`),
		enabled: !!eventId,
	});

	const { data: workDirections } = useQuery({
		queryKey: ["work-directions"],
		queryFn: () =>
			axios
				.get<WorkDirection[]>("/api/dictionary/work-directions")
				.then((res) => res.data),
	});

	useEffect(() => {
		if (eventData?.data) {
			form.resetFields();
			form.setFieldsValue({
				title: eventData.data.title,
				shortDescription: eventData.data.shortDescription,
				link: eventData.data.link,
				image: eventData.data.image,
			});

			if (eventData.data.image) {
				setImageUrl(eventData.data.image);
				setFileList([
					{
						uid: eventData.data.image,
						name: eventData.data.image,
						status: "done",
						url: eventData.data.image,
					},
				]);
			}
		}
	}, [eventData?.data, form]);

	const { mutateAsync: createEvent, isPending: isEventCreating } = useMutation({
		mutationFn: (values: any) =>
			axios.post("/api/user/event", values).then((res) => res.data),
		onSuccess: () => {
			onSubmit();
		},
	});

	const { mutateAsync: updateEvent, isPending: isEventUpdating } = useMutation({
		mutationFn: ({ _eventId, data }: any) =>
			axios.put(`/api/user/event/${_eventId}`, data),
		onSuccess: () => {
			onSubmit();
		},
	});

	const uploadEventImage = async (file: any) => {
		try {
			const data = new FormData();
			data.append("file", file);
			data.append("filename", "event-image");
			data.append("tag", "event");
			const res = await axios.post("/api/file", data);
			return await res.data;
		} catch (error) {
			console.error(error);
		}
	};

	const removeEventImage = async (fileUrl: string) => {
		try {
			await axios.delete("/api/file", { params: { fileUrl } });
			setImageUrl(undefined);
			form.setFieldValue("image", undefined);
		} catch (error) {
			console.error(error);
		}
	};

	const uploadProps: DraggerProps = {
		name: "file",
		multiple: false,
		accept: "image/png, image/jpeg",
		customRequest: async (options: any) => {
			const { file, onSuccess, onError } = options;
			setImageProcessing(true);
			try {
				const uploadedFileData = await uploadEventImage(file);
				setImageUrl(uploadedFileData.url);
				setFileList([
					{
						uid: file.uid || Date.now(),
						name: file.name,
						status: "done",
						url: uploadedFileData.url,
					},
				]);
				form.setFieldValue("image", uploadedFileData.url);
				if (onSuccess) onSuccess("ok");
			} catch (e) {
				if (onError) onError(e);
			}
			setImageProcessing(false);
		},
		fileList,
		onRemove: async (file: any) => {
			if (file.url) {
				await removeEventImage(file.url);
			}
			setFileList([]);
			setImageUrl(undefined);
			form.setFieldValue("image", undefined);
		},
		showUploadList: false,
	};

	const handleImageDelete = async () => {
		if (!imageUrl) return;
		setImageProcessing(true);
		await removeEventImage(imageUrl);
		setImageProcessing(false);
	};

	// Сохранить событие
	const handleOk = async () => {
		try {
			const values = await form.validateFields();

			// if (schedule.length === 0 && !values.schedule) {
			// 	message.error('Required to add at least one schedule item')
			// 	return
			// }

			if (eventId) {
				await updateEvent({
					_eventId: eventId,
					data: {
						...values,
						image: imageUrl,
						startDate: dayjs(values.dates[0]).toISOString(),
						endDate: dayjs(values.dates[1]).toISOString(),
					},
				});
			} else {
				await createEvent({
					...values,
					image: imageUrl,
					type: eventType,
					startDate: dayjs(values.dates[0]).toISOString(),
					endDate: dayjs(values.dates[1]).toISOString(),
				});

				message.success(t("event.modal.success", "Event created successfully"));
			}

			form.resetFields();
			setImageUrl(undefined);
		} catch (err) {
			console.error(err);
			message.error(t("event.modal.error", "Error creating event"));
		}
	};

	const handleCancel = () => {
		form.resetFields();
		setImageUrl(undefined);
		setFileList([]);
		onCancel();
	};

	const eventLabel = (eventType: EventType) => {
		switch (eventType) {
			case EventType.Meetup:
				return t("event.modal.meetup", "Meetup");
			case EventType.Workshop:
				return t("event.modal.workshop", "Workshop");
			case EventType.GameJam:
				return t("event.modal.gamejam", "Game Jam");
			case EventType.GameLab:
				return t("event.modal.gamelab", "Game Lab");
			case EventType.Conference:
				return t("event.modal.conference", "Conference");
			default:
				return t("event.modal.event", "Event");
		}
	};

	if (!eventType) return null;

	return (
		<Modal
			open={open}
			onCancel={handleCancel}
			confirmLoading={isEventCreating || isEventUpdating}
			onOk={handleOk}
			width={1000}
			centered
			title={
				eventId ? (
					<Space>
						<FaRegCalendarCheck size={24} />
						{t("event.modal.edit", "Edit event")}
					</Space>
				) : (
					<Space>
						<FaRegCalendarCheck size={24} />
						{t("event.modal.title", "Add {eventType}", {
							eventType: eventLabel(eventType),
						})}
					</Space>
				)
			}
			okText={
				eventId
					? t("event.modal.save", "Save")
					: t("event.modal.create", "Save draft")
			}
			cancelText={t("event.modal.cancel", "Cancel")}
			destroyOnHidden
			mask={{ closable: false }}
		>
			<Form
				form={form}
				variant="filled"
				layout="vertical"
				initialValues={{
					...initialValues,
					format: EventFormat.Online,
					lang: session?.user?.lang || Language.en,
				}}
				requiredMark="optional"
			>
				<Row gutter={16}>
					{isBigEvent ? (
						<Col span={24} style={{ marginBottom: 24 }}>
							{!imageUrl ? (
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
								<Spin spinning={imageProcessing}>
									<div
										className={styles.cover}
										style={{ aspectRatio: "16 / 9" }}
									>
										<Image src={`${imageUrl}?w=1200`} fill alt="" />
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
												onClick={handleImageDelete}
												icon={<TbTrash size={18} style={{ marginTop: 2 }} />}
											/>
										</Popover>
									</div>
								</Spin>
							)}
						</Col>
					) : null}
					<Col span={isBigEvent ? 24 : 8}>
						{!isBigEvent &&
							(!imageUrl ? (
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
								<Spin spinning={imageProcessing}>
									<div
										className={styles.cover}
										style={{ aspectRatio: "4 / 5" }}
									>
										<Image src={`${imageUrl}?w=750`} fill alt="" />
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
												onClick={handleImageDelete}
												icon={<TbTrash size={18} style={{ marginTop: 2 }} />}
											/>
										</Popover>
									</div>
								</Spin>
							))}
					</Col>
					<Col span={isBigEvent ? 24 : 16}>
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
							label={t("event.schedule.dates", "Dates (local time)")}
							name="dates"
							rules={[
								{
									required: true,
									message: t("event.schedule.dates.required", "Dates required"),
								},
							]}
						>
							<RangePicker
								style={{ width: "100%" }}
								showTime={{ format: "HH:mm", minuteStep: 5 }}
								format="YYYY-MM-DD HH:mm"
								id={{
									start: "startDate",
									end: "endDate",
								}}
								disabledTime={(date) => {
									if (!date || isStaff) return {};

									const now = dayjs();

									if (date.isSame(now, "day")) {
										const currentHour = now.hour();
										const currentMinute = now.minute();
										return {
											disabledHours: () =>
												Array.from({ length: 24 }, (_, i) => i).filter(
													(h) => h < currentHour,
												),
											disabledMinutes: () =>
												date.hour() === currentHour
													? Array.from({ length: 60 }, (_, i) => i).filter(
															(m) => m < currentMinute,
														)
													: [],
											disabledSeconds: () => [],
										};
									}

									return {
										disabledHours: () => [],
										disabledMinutes: () => [],
										disabledSeconds: () => [],
									};
								}}
								disabledDate={(current) =>
									current && !isStaff && current < dayjs().startOf("day")
								}
							/>
						</Form.Item>

						<Form.Item
							label={t("event.modal.direction", "Direction")}
							name="directionId"
							rules={[
								{
									required: true,
									message: t(
										"event.modal.direction.required",
										"Direction required",
									),
								},
							]}
						>
							<DirectionSelect
								placeholder={t(
									"event.modal.direction.placeholder",
									"Select direction",
								)}
								options={
									workDirections?.map((direction) => ({
										label: direction.name,
										value: direction.id,
									})) ?? []
								}
							/>
						</Form.Item>

						<Row gutter={16}>
							<Col span={12}>
								<Form.Item
									label={t("event.modal.format", "Format")}
									name="format"
									rules={[
										{
											required: true,
											message: t(
												"event.modal.format.required",
												"Format required",
											),
										},
									]}
								>
									<Select
										options={Object.values(EventFormat).map((format) => ({
											label: format,
											value: format,
										}))}
									/>
								</Form.Item>
							</Col>
							<Col span={12}>
								<Form.Item
									label={t("event.modal.language", "Language")}
									name="lang"
									rules={[
										{
											required: true,
											message: t(
												"event.modal.language.required",
												"Language required",
											),
										},
									]}
								>
									<Select
										options={Object.values(Language).map((lang) => ({
											label: lang.toUpperCase(),
											value: lang,
										}))}
									/>
								</Form.Item>
							</Col>
						</Row>

						<Form.Item label={t("event.modal.link", "Link")} name="url">
							<Input
								placeholder={t("event.modal.link.placeholder", "https://")}
							/>
						</Form.Item>
					</Col>
				</Row>
			</Form>
		</Modal>
	);
};

export default EventModal;
