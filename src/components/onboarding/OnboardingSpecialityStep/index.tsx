import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { AiOutlineDown } from "@react-icons/all-files/ai/AiOutlineDown";
import { AiOutlineUp } from "@react-icons/all-files/ai/AiOutlineUp";
import { PiWarningCircleLight } from "@react-icons/all-files/pi/PiWarningCircleLight";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTolgee } from "@tolgee/react";
import {
	Button,
	Col,
	Flex,
	Form,
	Input,
	message,
	Row,
	Select,
	Space,
	Spin,
	Tooltip,
	Typography,
	Upload,
	type UploadProps,
} from "antd";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { skillLevelsList } from "@/components/ui/skillLevel";

interface IOnboardingSpecialityStep {
	onSave: () => void;
	onPreviousStep: () => void;
}

const { Paragraph, Title, Text } = Typography;

export const OnboardingSpecialityStep = ({
	onSave,
	onPreviousStep = () => {},
}: IOnboardingSpecialityStep) => {
	const searchParams = useSearchParams();
	const pendingInvitationId = searchParams.get("pendingInvitation") as string;
	const [form] = Form.useForm();
	const [messageApi, contextHolder] = message.useMessage();
	const { t, getLanguage } = useTolgee();

	const [showParseCVButton, setShowParseCVButton] = useState(false);
	const [isParsing, setIsParsing] = useState(false);
	const [jobPosition, setJobPosition] = useState<string>("");
	const [showOptionalFields, setShowOptionalFields] = useState(false);

	const {
		data: workDirections,
		isLoading,
		isFetched,
	} = useQuery({
		queryKey: ["workDirections"],
		queryFn: () =>
			axios.get<prismaClient.WorkDirection[]>(
				"/api/dictionary/work-directions",
			),
		staleTime: Infinity,
	});

	const { data: specialityResponse } = useQuery({
		queryKey: ["onboarding", "speciality"],
		queryFn: () =>
			axios.get<
				prismaClient.Speciality & { direction: prismaClient.WorkDirection }
			>("/api/auth/registration/onboarding/speciality"),
		refetchInterval: false,
		refetchOnWindowFocus: false,
	});

	useEffect(() => {
		if (!specialityResponse?.data) return;
		const {
			id,
			name,
			level,
			direction,
			skills,
			tools,
			summary,
			specialization,
			portfolioUrl,
			jobs,
			schools,
		} = specialityResponse.data;
		form.setFieldsValue({
			id,
			name,
			level,
			workDirectionId: direction?.id,
			specialization,
			portfolioUrl,
			skills,
			tools: tools?.split("\n"),
			summary,
			jobs,
			schools,
		});
		const existNameValue = !!form.getFieldValue("name");
		setShowParseCVButton(existNameValue);
	}, [specialityResponse]);

	const { data: pendingInvitation } = useQuery({
		queryKey: ["team-invite", pendingInvitationId],
		queryFn: () =>
			axios.get<any>(`/api/user/pending-invitation/${pendingInvitationId}`),
		enabled: !!pendingInvitationId,
	});

	useEffect(() => {
		if (!pendingInvitation?.data) return;
		form.setFieldsValue({
			name: pendingInvitation.data.position,
			workDirectionId: pendingInvitation.data.directionId,
		});
		setShowParseCVButton(true);
	}, [pendingInvitation]);

	const { mutateAsync: createSpeciality, isPending: isCreating } = useMutation({
		mutationFn: ({ data }: any) =>
			axios.post<any>("/api/auth/registration/onboarding/speciality", { data }),
	});

	const { mutateAsync: updateSpeciality, isPending: isUpdating } = useMutation({
		mutationFn: ({ id, data }: any) =>
			axios.put<any>("/api/auth/registration/onboarding/speciality", {
				id,
				data,
			}),
	});

	const workDirectionOptions = workDirections?.data.map((direction) => ({
		value: direction.id,
		label: t(`workDirection-${direction.name}`, direction.name),
	}));

	const handleSave = async () => {
		try {
			const data = await form.validateFields();

			if (data.id) {
				await updateSpeciality({ id: data.id, data });
			} else {
				await createSpeciality({ data });
			}

			onSave();
		} catch (error: any) {
			if (!error.response || !error.message) return;

			messageApi.error(error.response?.data?.message || error.message);
		}
	};

	const uploadProps: UploadProps = useMemo(
		() => ({
			name: "file",
			accept: ".pdf",
			action: "/api/user/parse/cv",
			showUploadList: false,
			data: { jobPosition, locale: getLanguage() },
			maxCount: 1,
			onChange: ({ file }) => {
				if (
					file.status === "done" &&
					(!file.response || file.response.success == false)
				) {
					setIsParsing(false);
					messageApi.error(
						t(
							"uploadcv-error-message",
							`We couldn't process your file. Enter data manually`,
						),
					);
					return;
				}

				if (file.status == "uploading") {
					setIsParsing(true);
				}

				if (file.status == "error") {
					messageApi.error(
						t(
							"uploadcv-error-message",
							`We couldn't process your file. Enter data manually`,
						),
					);
					setIsParsing(false);
					return;
				}

				if (file.status === "done") {
					fillForm(file.response);
					setIsParsing(false);
				}
			},
		}),
		[form, jobPosition],
	);

	const fillForm = (data: any) => {
		const {
			workAreaId,
			tools,
			summary,
			specialization,
			skills,
			experience,
			education,
			portfolioLink,
		} = data;

		form.setFieldsValue({
			summary,
			workDirectionId: workAreaId,
			specialization,
			skills: skills?.join("\n"),
			tools: tools?.join("\n"),
			portfolioUrl: portfolioLink,
			jobs: experience
				?.map(
					(job: any) =>
						`${job.from} - ${job.to}, ${job.roleName}, ${job.companyName}`,
				)
				.join("\n"),
			schools: education
				?.map(
					(school: any) =>
						`${school.from} - ${school.to}, ${school.speciality}, ${school.degree}, ${school.school}`,
				)
				.join("\n"),
		});
	};

	const handleJobPositionChange = (value: string) => {
		setShowParseCVButton(!!value);
		setJobPosition(value);
	};

	return (
		<>
			{contextHolder}
			<Spin spinning={(isLoading && !isFetched) || isParsing}>
				<div className="onboarding-content">
					<div className="onboarding-form">
						<Space
							direction="vertical"
							className="onboarding-form-title"
							style={{ width: "100%" }}
						>
							<Flex justify="space-between" align="center" wrap="wrap">
								<Title level={2}>
									{t(
										"speciality",
										"Speciality" +
											(pendingInvitation ? " (by invitation)" : ""),
									)}
								</Title>
								<Flex align="center" gap={4}>
									<PiWarningCircleLight
										size={20}
										color="#05050573"
										style={{ height: 20 }}
									/>
									<Text type="secondary" italic>
										{t(
											"onboarding.speciality.you-can-change-it-or-add-more-ones-after",
											"You can change it or add more ones after",
										)}
									</Text>
								</Flex>
							</Flex>

							<Paragraph italic>
								{t(
									"onboarding.speciality.information-about-your-main-speciality",
									"Information about your main speciality",
								)}
							</Paragraph>
						</Space>

						<Form
							variant="filled"
							form={form}
							layout="vertical"
							requiredMark="optional"
							autoComplete="off"
							scrollToFirstError
						>
							<Form.Item name="id" hidden>
								<Input />
							</Form.Item>

							<Form.Item name="tools" hidden>
								<Input />
							</Form.Item>

							<Form.Item name="summary" hidden>
								<Input />
							</Form.Item>

							<Space direction="vertical" size={16} style={{ width: "100%" }}>
								<Row gutter={[32, 16]}>
									<Col xs={24} lg={16}>
										<Form.Item
											name="name"
											label={t("specialityName")}
											rules={[{ required: true }]}
											extra={
												showParseCVButton && (
													<Space style={{ marginTop: 4 }}>
														<Text>
															{t(
																"onboarding.speciality.fill-in-from-cv-resume",
																"Fill in from CV/resume",
															)}
														</Text>
														<Upload {...uploadProps} disabled={isParsing}>
															<Button
																size="small"
																disabled={isParsing}
																loading={isParsing}
															>
																{t(
																	"onboarding.speciality.upload-pdf",
																	"Upload PDF",
																)}
															</Button>
														</Upload>
													</Space>
												)
											}
										>
											<Input
												placeholder={t("specialityName.plachehloder")}
												onChange={(e) =>
													handleJobPositionChange(e.target.value)
												}
											/>
										</Form.Item>
									</Col>
									<Col xs={24} lg={8}>
										<Form.Item
											name="level"
											label={t("specialityLevel")}
											rules={[{ required: true }]}
											wrapperCol={{ span: 24 }}
										>
											<Select
												placeholder={t("select")}
												style={{ width: "100%" }}
											>
												{skillLevelsList.map((item, indx: number) => (
													<Select.Option
														key={indx.toString()}
														value={item.value}
													>
														{item.value !== form.getFieldValue("Level") ? (
															<Tooltip
																title={item.description}
																placement="right"
															>
																{item.icon} {item.label}
															</Tooltip>
														) : (
															<>
																{item.icon} {item.label}
															</>
														)}
													</Select.Option>
												))}
											</Select>
										</Form.Item>
									</Col>
								</Row>

								<Row gutter={[32, 16]}>
									<Col xs={24} lg={24}>
										<Form.Item
											name="workDirectionId"
											label={t("workDirection")}
											rules={[{ required: true }]}
										>
											<Select
												style={{ width: "100%" }}
												placeholder={t(`For example: Game Design`)}
												options={workDirectionOptions}
												disabled={!!pendingInvitation}
											/>
										</Form.Item>
									</Col>
								</Row>

								<Form.Item
									name="specialization"
									label={t("specialization")}
									rules={[{ required: true }]}
								>
									<Input.TextArea
										placeholder={t("specialization.plachehloder")}
									/>
								</Form.Item>

								<Form.Item
									name="jobs"
									label={t("experience")}
									rules={[{ required: true }]}
								>
									<Input.TextArea
										placeholder={t("experience.plachehloder")}
										rows={4}
									/>
								</Form.Item>

								<div style={{ display: showOptionalFields ? "block" : "none" }}>
									<Form.Item
										name="portfolioUrl"
										label={t("cvLink")}
										rules={[{ type: "url" }]}
									>
										<Input placeholder={t("cvLink.plachehloder")} />
									</Form.Item>

									<Row gutter={[32, 16]}>
										<Col xs={24} lg={24}>
											<Form.Item
												name="skills"
												label={t("skillList")}
												wrapperCol={{ span: 24 }}
												extra={t("skillList.extra")}
											>
												<Input.TextArea
													rows={4}
													placeholder={t("skillList.plachehloder")}
												/>
											</Form.Item>
										</Col>
									</Row>

									<Row gutter={[32, 16]}>
										<Col xs={24} lg={24}>
											<Form.Item name="schools" label={t("education")}>
												<Input.TextArea
													placeholder={t("education.plachehloder")}
													rows={4}
												/>
											</Form.Item>
										</Col>
									</Row>
								</div>

								{/** biome-ignore lint/a11y/noStaticElementInteractions: <explanation> */}
								{/** biome-ignore lint/a11y/useValidAnchor: <explanation> */}
								<a onClick={() => setShowOptionalFields((prev) => !prev)}>
									<Space>
										{showOptionalFields
											? t(
													"onboarding.speciality.hide-additional-fields",
													"Hide additional fields",
												)
											: t(
													"onboarding.speciality.fill-additional-fields",
													"Fill additional fields",
												)}
										{showOptionalFields ? <AiOutlineUp /> : <AiOutlineDown />}
									</Space>
								</a>
							</Space>
						</Form>
					</div>
					<div className="onboarding-footer">
						<Button onClick={onPreviousStep}>
							{t("onboarding.speciality.back", "Back")}
						</Button>
						<Button
							type="primary"
							onClick={handleSave}
							loading={isCreating || isUpdating}
						>
							{t(
								"onboarding.speciality.save-and-continue",
								"Save and continue",
							)}
						</Button>
					</div>
				</div>
			</Spin>
		</>
	);
};
