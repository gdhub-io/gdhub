import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useMutation, useQuery } from "@tanstack/react-query";
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
	TimePicker,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import { useSession } from "next-auth/react";

const PropositionLectureModal = ({ lectureId, open, onOk, onCancel }: any) => {
	const [form] = Form.useForm();
	const { data: session } = useSession();
	const { t } = useTranslate();

	const { data: workDirections } = useQuery({
		queryKey: ["workDirections"],
		queryFn: () =>
			axios.get<prismaClient.WorkDirection[]>(
				"/api/dictionary/work-directions",
			),
		staleTime: Infinity,
	});
	const { mutateAsync: createLecture, isPending: isCreating } = useMutation({
		mutationFn: (data: Partial<prismaClient.Lecture>) =>
			axios.post<prismaClient.Lecture>("/api/user/lecture", {
				...data,
				stage: prismaClient.LectureStage.Proposed,
			}),
	});

	const { mutateAsync: updateLecture, isPending: isUpdating } = useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: string;
			data: Partial<prismaClient.Lecture>;
		}) =>
			axios.put<prismaClient.Lecture>("/api/user/lecture", data, {
				params: { id },
			}),
	});

	const directionsOptions = workDirections?.data.map((direction) => ({
		value: direction.id,
		label: direction.name,
	}));

	const handleOk = async () => {
		try {
			const {
				name,
				lecturerId,
				directionId,
				description,
				linkToStream,
				date,
				time,
				duration,
			} = await form.validateFields();

			const newData: Partial<prismaClient.Lecture> = {
				name,
				directionId,
				description,
				linkToStream,
				date: date
					.set({
						hours: time.hour(),
						minutes: time.minute(),
						seconds: 0,
					})
					.toISOString(),
				duration: duration.hour() * 60 * 60 + duration.minute() * 60,
				wishes: null,
			};

			if (lectureId) {
				await updateLecture({ id: lectureId, data: newData });
				message.success(t("The Offer of the Lecture has been created"));
			} else {
				await createLecture(newData);
				message.success(t("The proposal of the lecture is updated"));
			}

			form.resetFields();
			onOk();
		} catch (error: any) {
			if (!Object.hasOwn(error, "errorFields")) {
				message.error(error?.message);
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

	const handleCancel = () => {
		form.resetFields();
		onCancel();
	};

	return (
		<Modal
			centered
			title={
				lectureId
					? t(
							"modal.proposition-lecture.title.change",
							"Change the parametes of lectures",
						)
					: t(
							"modal.proposition-lecture.title.give",
							"I want to give a lecture",
						)
			}
			width={800}
			destroyOnHidden
			mask={{ closable: false }}
			cancelText={t("modal.proposition-lecture.title.close", "Close")}
			okText={
				lectureId
					? t("modal.proposition-lecture.title.save", "Save")
					: t("modal.proposition-lecture.title.publish", "Publish")
			}
			open={open}
			onOk={handleOk}
			onCancel={handleCancel}
			confirmLoading={isCreating || isUpdating}
		>
			<Spin spinning={isCreating || isUpdating}>
				<Form
					form={form}
					layout="vertical"
					variant="filled"
					name="lecture-request-form"
					wrapperCol={{ span: 12 }}
					onFinish={() => {}}
					onFinishFailed={() => {}}
					autoComplete="off"
					requiredMark="optional"
					initialValues={{
						lecturerId: session?.user.id,
						duration: dayjs().hour(1).minute(0).second(0),
						date: dayjs().add(1, "day"),
						time: dayjs().add(2, "hours").minute(0).second(0),
					}}
				>
					<Form.Item name="lecturerId" required hidden noStyle>
						<Input />
					</Form.Item>
					<Form.Item
						label={t(
							"modal.proposition-lecture.field.lecturer.label",
							"Lecturer",
						)}
						required
						wrapperCol={{ span: 24 }}
					>
						<Input
							style={{ color: "#666" }}
							width={"100%"}
							readOnly
							disabled
							value={session?.user.name || ""}
						/>
					</Form.Item>

					<Form.Item
						label={t(
							"modal.proposition-lecture.field.name.label",
							"Lecture Theme",
						)}
						name="name"
						rules={[{ required: true }]}
						required
						wrapperCol={{ span: 24 }}
					>
						<Input
							width={"100%"}
							placeholder={t(
								"modal.proposition-lecture.field.name.placeholder",
								`For example: how to analyze the project`,
							)}
						/>
					</Form.Item>

					<Form.Item
						name="directionId"
						label={t(
							"modal.proposition-lecture.field.directionId.label",
							"What direction does this lecture belong",
						)}
						wrapperCol={{ span: 24 }}
						rules={[{ required: true }]}
						required
					>
						<Select
							style={{ width: "100%" }}
							placeholder={t(
								"modal.proposition-lecture.field.directionId.placeholder",
								`For example: Game design`,
							)}
							options={directionsOptions}
						/>
					</Form.Item>

					<Form.Item
						name="description"
						label={t(
							"modal.proposition-lecture.field.description.label",
							"Lecture plan.What are you planning to talk about",
						)}
						rules={[{ required: true }]}
						wrapperCol={{ span: 24 }}
					>
						<Input.TextArea rows={8} />
					</Form.Item>

					<Row>
						<Col>
							<Form.Item
								name="date"
								label={t("modal.proposition-lecture.field.date.label", "Date")}
								rules={[{ required: true }]}
								wrapperCol={{ span: 24 }}
							>
								<DatePicker
									format="DD.MM.YYYY"
									disabledDate={(current) =>
										current && current < dayjs().endOf("day")
									}
								/>
							</Form.Item>
						</Col>
						<Col offset={1}>
							<Form.Item
								name="time"
								label={t("modal.proposition-lecture.field.time.label", "Time")}
								rules={[{ required: true }]}
								wrapperCol={{ span: 24 }}
								extra={
									<small>
										{t(
											"modal.proposition-lecture.field.time.extra",
											"Time zone",
										)}{" "}
										{dayjs().tz().offsetName("short")}
									</small>
								}
							>
								<TimePicker format="HH:mm" minuteStep={30} />
							</Form.Item>
						</Col>
					</Row>

					<Form.Item
						label={t(
							"modal.proposition-lecture.field.linkToStream.label",
							"Link to the lecture",
						)}
						name="linkToStream"
						extra={
							<div>
								{t(
									"modal.proposition-lecture.field.linkToStream.extra.part1",
									"Create a link to broadcast in",
								)}{" "}
								<Link href="https://meet.google.com/" target="_blank">
									Google Meet
								</Link>{" "}
								{t(
									"modal.proposition-lecture.field.linkToStream.extra.part2",
									"(or on another service) and insert into this field.",
								)}
							</div>
						}
						rules={[{ required: true, type: "url" }]}
						required
						wrapperCol={{ span: 24 }}
					>
						<Input width={"100%"} />
					</Form.Item>

					<Form.Item
						name="duration"
						label={t(
							"modal.proposition-lecture.field.duration.label",
							"Duration of the lecture",
						)}
						rules={[{ required: true }]}
						wrapperCol={{ span: 24 }}
					>
						<TimePicker format="HH:mm" minuteStep={10} />
					</Form.Item>
				</Form>
			</Spin>
		</Modal>
	);
};

export default PropositionLectureModal;
