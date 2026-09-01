import type { WorkDirection } from "@gdhub-io/gdhub-prisma";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Col,
	DatePicker,
	Form,
	Input,
	Modal,
	message,
	Row,
	Select,
	Spin,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import debounce from "lodash/debounce";
import { useSession } from "next-auth/react";
import qs from "qs";
import React, { useEffect } from "react";
import { DirectionSelect } from "@/components/DirectionSelect";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { EventFormat, Language } from "@/config/prisma-enums";
import type { ScheduleItemFormValues } from ".";
import styles from "./style.module.scss";

const { RangePicker } = DatePicker;

interface ScheduleItemModalProps {
	open: boolean;
	onCancel: () => void;
	onSubmit: (item: ScheduleItemFormValues) => void | Promise<any>;
	initialValues?: ScheduleItemFormValues;
	isAdmin: boolean;
}

const ScheduleItemModal: React.FC<ScheduleItemModalProps> = ({
	open,
	onCancel,
	onSubmit,
	initialValues,
	isAdmin,
}) => {
	const [form] = Form.useForm();
	const { t } = useTranslate();
	const { data: session } = useSession();
	const [searchSpeakersValue, setSearchSpeakersValue] = React.useState("");
	const [speakerOptions, setSpeakerOptions] = React.useState<
		{ label: string; value: string; avatar?: string; speciality?: string }[]
	>([]);
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const format = Form.useWatch("format", form);

	// on open modal, set initial values and refetch speakers
	useEffect(() => {
		if (open) {
			if (initialValues) {
				form.setFieldsValue({
					...initialValues,
					dates: [
						dayjs(initialValues?.startDate),
						dayjs(initialValues?.endDate),
					],
					speakers: initialValues?.speakers?.map((s: any) => s.id),
				});
			}

			refetchSpeakers();
		} else {
			form.resetFields();
			setSearchSpeakersValue("");
			setSpeakerOptions([]);
		}
	}, [open, initialValues]);

	const handleSearch = React.useMemo(
		() =>
			debounce((value: string) => {
				setSearchSpeakersValue(value);
			}, 500),
		[],
	);

	const {
		data: speakersData,
		isFetching,
		dataUpdatedAt: speakersDataUpdatedAt,
		refetch: refetchSpeakers,
	} = useQuery({
		queryKey: [
			"speakers-search",
			searchSpeakersValue,
			initialValues?.speakers?.length,
		],
		queryFn: () =>
			axios.get("/api/speakers/search", {
				params: {
					query: searchSpeakersValue,
					ids: initialValues?.speakers?.map((s) => s.id),
				},
				paramsSerializer: (params) =>
					qs.stringify(params, { arrayFormat: "repeat" }),
			}),
		enabled:
			(!!searchSpeakersValue || !!initialValues?.speakers?.length) &&
			(isAdmin || process.env.NODE_ENV === "development"),
	});

	const { data: workDirections } = useQuery({
		queryKey: ["work-directions"],
		queryFn: () =>
			axios
				.get<WorkDirection[]>("/api/dictionary/work-directions")
				.then((res) => res.data),
	});

	useEffect(() => {
		if (speakersData?.data) {
			setSpeakerOptions(
				speakersData.data.map((item: any) => ({
					label: item.name,
					value: item.id,
					avatar: item.image,
					speciality: item.speciality || item.direction || "No speciality",
				})),
			);

			// form.setFieldsValue({
			// 	speakers: initialValues?.speakers?.map((s: any) => s.id),
			// })
		}
	}, [speakersData?.data, speakersDataUpdatedAt]);

	const handleOk = async () => {
		try {
			const values = await form.validateFields();

			const data = {
				id: initialValues?.id || null,
				title: values.title,
				description: values.description,
				url: values.url,
				startDate: dayjs(values.dates[0]).toISOString(),
				endDate: dayjs(values.dates[1]).toISOString(),
				speakers: values.speakers || [],
				directionId: values.directionId,
				format: values.format,
				language: values.language,
				// An online session has no venue; keeping a stale address on one would
				// put a room on the public page for a call.
				address:
					values.format === EventFormat.Offline ? values.address || null : null,
			};

			setIsSubmitting(true);

			await onSubmit(data);

			setIsSubmitting(false);

			form.resetFields();
		} catch (err) {
			console.log("error", err);
			message.error(
				t("event.schedule.modal.error", "Error saving schedule item"),
			);
		}
	};

	return (
		<Modal
			open={open}
			title={t("event.schedule.modal.title", "Schedule Item")}
			centered
			onCancel={onCancel}
			onOk={handleOk}
			mask={{ closable: false }}
			okText={t("common.save", "Save")}
			cancelText={t("common.cancel", "Cancel")}
			destroyOnHidden
			confirmLoading={isSubmitting}
			width={800}
		>
			<Form
				form={form}
				variant="filled"
				layout="vertical"
				requiredMark="optional"
				initialValues={{
					format: EventFormat.Online,
					language: session?.user?.lang || Language.en,
				}}
			>
				<Row gutter={[24, 0]}>
					<Col xs={24} md={12}>
						<div className={styles.sectionLabel}>
							{t("event.schedule.section.when", "When & where")}
						</div>
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
									if (!date || isAdmin) return {};

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
									current && !isAdmin && current < dayjs().startOf("day")
								}
							/>
						</Form.Item>
						<Form.Item
							name="format"
							rules={[
								{
									required: true,
									message: t(
										"event.schedule.format.required",
										"Format required",
									),
								},
							]}
							label={t("event.schedule.format", "Format")}
						>
							<Select
								options={Object.values(EventFormat).map((format) => ({
									label: format,
									value: format,
								}))}
							/>
						</Form.Item>

						{/* Only an offline session has somewhere to be. The form's
					    `requiredMark="optional"` tags the label by itself. */}
						{format === EventFormat.Offline && (
							<Form.Item
								name="address"
								label={t("event.schedule.address", "Address")}
							>
								<Input
									placeholder={t(
										"event.schedule.address.placeholder",
										"Room, venue or street address",
									)}
									allowClear
								/>
							</Form.Item>
						)}

						<Form.Item
							name="language"
							rules={[
								{
									required: true,
									message: t(
										"event.schedule.language.required",
										"Language required",
									),
								},
							]}
							label={t("event.schedule.language", "Language")}
						>
							<Select
								options={Object.values(Language).map((language) => ({
									label: language.toUpperCase(),
									value: language,
								}))}
							/>
						</Form.Item>
					</Col>

					<Col xs={24} md={12}>
						<div className={styles.sectionLabel}>
							{t("event.schedule.section.what", "What")}
						</div>
						<Form.Item label={t("event.schedule.title", "Title")} name="title">
							<Input
								placeholder={t(
									"event.schedule.title.placeholder",
									"Slot title",
								)}
								allowClear
							/>
						</Form.Item>
						<Form.Item
							label={t("event.schedule.direction", "Direction")}
							name="directionId"
							rules={[
								{
									required: true,
									message: t(
										"event.schedule.direction.required",
										"Direction required",
									),
								},
							]}
						>
							<DirectionSelect
								options={
									workDirections?.map((direction) => ({
										label: direction.name,
										value: direction.id,
									})) ?? []
								}
								placeholder={t(
									"event.schedule.direction.placeholder",
									"Select direction",
								)}
							/>
						</Form.Item>
						<Form.Item
							label={t("event.schedule.speakers", "Speakers")}
							name="speakers"
						>
							<Select
								mode="multiple"
								allowClear
								showSearch
								placeholder={t(
									"event.schedule.speakers.placeholder",
									"Select speakers",
								)}
								filterOption={false}
								onSearch={handleSearch}
								options={speakerOptions}
								loading={isFetching}
								style={{ width: "100%" }}
								optionLabelProp="label"
								notFoundContent={isFetching ? <Spin size="small" /> : null}
								optionRender={(option) => {
									const { label, avatar, speciality } = option.data;
									return (
										<div
											style={{ display: "flex", alignItems: "center", gap: 8 }}
										>
											<AppAvatar
												size={24}
												src={avatar}
												style={{ marginRight: 8 }}
											>
												{!avatar && label ? label[0] : null}
											</AppAvatar>
											<div>
												<div>{label}</div>
												<div
													style={{
														fontSize: 12,
														color: "var(--gd-color-text-secondary)",
													}}
												>
													{speciality || "No speciality"}
												</div>
											</div>
										</div>
									);
								}}
							/>
						</Form.Item>
						<Form.Item
							label={t("event.schedule.description", "Description")}
							name="description"
						>
							<Input.TextArea
								rows={2}
								placeholder={t(
									"event.schedule.description.placeholder",
									"What happens in this slot, in a sentence or two.",
								)}
								allowClear
							/>
						</Form.Item>
						<Form.Item label={t("event.schedule.link", "Link")} name="url">
							<Input
								placeholder={t("event.schedule.link.placeholder", "https://")}
								allowClear
							/>
						</Form.Item>
					</Col>
				</Row>
			</Form>
		</Modal>
	);
};

export default ScheduleItemModal;
