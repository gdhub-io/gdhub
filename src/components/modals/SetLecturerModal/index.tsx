import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
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
	Spin,
	TimePicker,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { DirectionSelect } from "@/components/DirectionSelect";

const SetLecturerModal = ({ lectureId, open, onOk, onCancel }: any) => {
	const [form] = Form.useForm();
	const { t } = useTranslate();
	const { data: session } = useSession();
	const [speakerRequest, setSpeakerRequest] =
		useState<prismaClient.LecturerRequest>();

	const { data: lectureRequest, isLoading: isLoadingLecture } = useQuery({
		queryKey: ["lecturer-request", lectureId],
		queryFn: () =>
			axios.get<
				prismaClient.Lecture & {
					lecturerRequests: prismaClient.LecturerRequest[];
				}
			>("/api/user/lecture", {
				params: { id: lectureId },
			}),
		enabled: !!lectureId,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		refetchOnMount: false,
	});

	useEffect(() => {
		if (!lectureRequest?.data) return;

		form.setFieldsValue({
			name: lectureRequest.data.name,
			wishes: lectureRequest.data.wishes,
			directionId: lectureRequest.data.directionId,
		});

		if (session) {
			const speakerRequest = lectureRequest.data.lecturerRequests?.find(
				(r) => r.userId == session.user.id,
			);

			if (speakerRequest) {
				setSpeakerRequest(speakerRequest);

				form.setFieldsValue({
					linkToStream: speakerRequest.linkToStream,
					curriculum: speakerRequest.curriculum,
					date: speakerRequest.date ? dayjs(speakerRequest.date) : undefined,
					time: speakerRequest.date ? dayjs(speakerRequest.date) : undefined,
				});
			}
		}
	}, [lectureRequest?.data]);

	const { mutateAsync: createLecturerRequest } = useMutation({
		mutationFn: (data: Partial<prismaClient.LecturerRequest>) =>
			axios.post<any>(`/api/user/lecture/${lectureId}/lecturer`, data),
	});

	const { mutateAsync: updateLecturerRequest } = useMutation({
		mutationFn: ({
			lecturerRequestId,
			data,
		}: {
			lecturerRequestId: string;
			data: Partial<prismaClient.LecturerRequest>;
		}) =>
			axios.put<any>(
				`/api/user/lecture/${lectureId}/lecturer/${lecturerRequestId}`,
				data,
			),
	});

	const { data: workDirections } = useQuery({
		queryKey: ["workDirections"],
		queryFn: () =>
			axios.get<prismaClient.WorkDirection[]>(
				"/api/dictionary/work-directions",
			),
		staleTime: Infinity,
	});

	const directionsOptions = workDirections?.data.map((direction) => ({
		value: direction.id,
		label: direction.name,
	}));

	const handleOk = async () => {
		try {
			const formData = await form.validateFields();
			const date = formData.date
				.set("hour", formData.time.hour())
				.set("minute", formData.time ? formData.time?.minute() : 0)
				.set("second", 0);

			if (speakerRequest) {
				await updateLecturerRequest({
					lecturerRequestId: speakerRequest.id,
					data: {
						directionId: formData.directionId,
						lectureId,
						curriculum: formData.curriculum,
						linkToStream: formData.linkToStream,
						date: date.toISOString(),
					},
				});

				message.success(
					t("modal.setLecturer.updateSuccess", "Your proposal is updated"),
				);
			} else {
				await createLecturerRequest({
					directionId: formData.directionId,
					lectureId,
					curriculum: formData.curriculum,
					linkToStream: formData.linkToStream,
					date: date.toISOString(),
				});

				message.success(
					t(
						"modal.setLecturer.createSuccess",
						"Your proposal to conduct a lecture sent",
					),
				);
			}

			form.resetFields();

			onOk();
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

	const handleCancel = () => {
		form.resetFields();
		onCancel();
	};

	return (
		<Modal
			centered
			title={t("modal.setLecturer.title", "I want to give this lecture")}
			width={800}
			destroyOnHidden
			mask={{ closable: false }}
			cancelText={t("modal.setLecturer.close", "Close")}
			okText={
				speakerRequest
					? t("modal.setLecturer.save", "Save")
					: t("modal.setLecturer.offer", "Offer")
			}
			open={open}
			onOk={handleOk}
			onCancel={handleCancel}
			confirmLoading={isLoadingLecture}
		>
			<Spin spinning={isLoadingLecture}>
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
				>
					<Form.Item name="lecturerId" hidden noStyle>
						<Input />
					</Form.Item>

					<Form.Item
						label={t("modal.setLecturer.lectureTheme", "Lecture theme")}
						name="name"
						rules={[{ required: true }]}
						required
						wrapperCol={{ span: 24 }}
					>
						<Input
							width={"100%"}
							readOnly
							disabled
							style={{ color: "#000", padding: 0, fontWeight: "bold" }}
							bordered={false}
						/>
					</Form.Item>

					<Form.Item
						name="wishes"
						label={t(
							"modal.setLecturer.wishes",
							"Wishes for the content of the lecture",
						)}
						rules={[{ required: true }]}
						wrapperCol={{ span: 24 }}
					>
						<Input.TextArea
							rows={4}
							disabled
							readOnly
							style={{ color: "#000" }}
						/>
					</Form.Item>

					<Form.Item
						name="directionId"
						label={t(
							"modal.setLecturer.direction",
							"What direction does this lecture belong",
						)}
						wrapperCol={{ span: 24 }}
						required
					>
						<DirectionSelect
							style={{ width: "100%" }}
							placeholder={t("For example: game design")}
							options={directionsOptions ?? []}
						/>
					</Form.Item>

					<Form.Item
						name="curriculum"
						label={t(
							"modal.setLecturer.curriculum",
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
								label={t("modal.setLecturer.date", "Date")}
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
								label={t("modal.setLecturer.time", "Time")}
								rules={[{ required: true }]}
								wrapperCol={{ span: 24 }}
								extra={
									<small>
										{t("modal.setLecturer.timeZone", "Time zone")}{" "}
										{dayjs().tz().offsetName("short")}
									</small>
								}
							>
								<TimePicker format="HH:mm" minuteStep={15} />
							</Form.Item>
						</Col>
					</Row>

					<Form.Item
						label={t("modal.setLecturer.linkToStream", "Link to the broadcast")}
						name="linkToStream"
						extra={
							<div>
								{t(
									"modal.setLecturer.linkToStream.extra.part1",
									"Create a link to a broadcast in",
								)}{" "}
								<Link href="https://meet.google.com/" target="_blank">
									Google Meet
								</Link>{" "}
								{t(
									"modal.setLecturer.linkToStream.extra.part2",
									"(or on another service) and insert into this field.",
								)}
							</div>
						}
						rules={[{ type: "url" }]}
						wrapperCol={{ span: 24 }}
					>
						<Input width={"100%"} />
					</Form.Item>
				</Form>
			</Spin>
		</Modal>
	);
};

export default SetLecturerModal;
