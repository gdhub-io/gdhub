import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { AiOutlineQuestionCircle } from "@react-icons/all-files/ai/AiOutlineQuestionCircle";
import { PiRocketDuotone } from "@react-icons/all-files/pi/PiRocketDuotone";
import { useMutation } from "@tanstack/react-query";
import { T, useTolgee } from "@tolgee/react";
import {
	Alert,
	Button,
	Checkbox,
	Flex,
	Form,
	Input,
	InputNumber,
	Modal,
	message,
	Space,
	Spin,
	Switch,
	Tooltip,
	Typography,
} from "antd";
import axios, { type AxiosError, type AxiosResponse } from "axios";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import ProjectLegalPreviewModal from "@/components/legal/ProjectLegalPreviewModal";
import {
	DEFAULT_DAMAGE_COMPENSATION_AMOUNT,
	DEFAULT_DAMAGE_COMPENSATION_CURRENCY,
	DEFAULT_INVESTMENT_RESERVE,
	DEFAULT_MENTOR_FUND_SHARE,
	MIN_MENTOR_FUND_SHARE,
	PLATFORM_SHARE_PERCENT,
} from "@/config/legal";
import { gtmEventTrigger } from "@/helpers/gtm";
import styles from "./style.module.scss";

const { Paragraph, Text } = Typography;

type CreateProjectModalProps = {
	open: boolean;
	onCancel: () => void;
};

type CreateProjectFormValues = {
	name: string;
	description?: string;
	acceptRequirements: boolean;
	useCoDevelopmentAgreement: boolean;
	authorAgreementAccepted: boolean;
	mentorFundShare: number;
	damageCompensationEnabled: boolean;
	damageCompensationAmount: number;
};

const CreateProjectModal = ({ open, onCancel }: CreateProjectModalProps) => {
	const router = useRouter();
	const [form] = Form.useForm<CreateProjectFormValues>();
	const { t, getLanguage } = useTolgee();
	const { data: session } = useSession();
	const [currentStep, setCurrentStep] = useState(0);
	const [showAgreementPreview, setShowAgreementPreview] = useState(false);
	const [isCoDevelopmentEnabled, setIsCoDevelopmentEnabled] = useState(true);
	const watchedProjectName = Form.useWatch("name", form);
	const projectName = (
		watchedProjectName ??
		form.getFieldValue("name") ??
		""
	).trim();
	const mentorFundShare =
		Form.useWatch("mentorFundShare", form) ?? DEFAULT_MENTOR_FUND_SHARE;
	const damageCompensationEnabled =
		Form.useWatch("damageCompensationEnabled", form) ?? false;
	const damageCompensationAmount =
		Form.useWatch("damageCompensationAmount", form) ??
		DEFAULT_DAMAGE_COMPENSATION_AMOUNT;

	const {
		mutateAsync: createProject,
		error: createProjectError,
		isPending: isCreateProcessing,
	} = useMutation<
		AxiosResponse<prismaClient.Project>,
		AxiosError<{ message?: string }>,
		CreateProjectFormValues
	>({
		mutationFn: (data: CreateProjectFormValues) =>
			axios.post<prismaClient.Project>("/api/user/project", data),
	});

	useEffect(() => {
		const error = createProjectError as AxiosError<{ message?: string }>;
		if (error?.response?.data?.message) {
			message.error(error.response?.data?.message);
		}
	}, [createProjectError]);

	useEffect(() => {
		if (open) return;

		setCurrentStep(0);
		setShowAgreementPreview(false);
		setIsCoDevelopmentEnabled(true);
		form.resetFields();
	}, [form, open]);

	const projectAppendixInput = useMemo(() => {
		return {
			projectName: projectName || t("New project"),
			authorName: session?.user?.name || undefined,
			mentorFundShare,
			platformShare: PLATFORM_SHARE_PERCENT,
			damageCompensationEnabled,
			damageCompensationAmount,
			damageCompensationCurrency: DEFAULT_DAMAGE_COMPENSATION_CURRENCY,
		};
	}, [
		damageCompensationAmount,
		damageCompensationEnabled,
		mentorFundShare,
		projectName,
		session?.user?.name,
		t,
	]);

	const handleCreate = async () => {
		let data: CreateProjectFormValues | undefined;

		try {
			data = await form.validateFields();
		} catch (error) {
			const hasErrorFields =
				typeof error === "object" &&
				error !== null &&
				Object.hasOwn(error, "errorFields");

			if (!hasErrorFields) {
				message.error(
					error instanceof Error ? error.message : t("Unknown error"),
				);
				return;
			}
		}

		if (!data) return;

		const payload: CreateProjectFormValues = {
			...data,
			damageCompensationEnabled: Boolean(data.damageCompensationEnabled),
			damageCompensationAmount:
				data.damageCompensationAmount ?? DEFAULT_DAMAGE_COMPENSATION_AMOUNT,
		};

		const project = await createProject(payload);
		gtmEventTrigger("project_create", {
			projectId: project.data.id,
			name: project.data.name,
		});

		router.push(`/my/projects/${project.data.slug}`);
	};

	const handleContinue = async () => {
		try {
			await form.validateFields(["name"]);
			setCurrentStep(1);
		} catch (error) {
			console.error(error);
		}
	};

	const handleCancel = () => {
		onCancel();
	};

	const handleAgreementToggle = (checked: boolean) => {
		form.setFieldValue("useCoDevelopmentAgreement", checked);
		setIsCoDevelopmentEnabled(checked);
	};

	const validateLegalAllocation = async () => {
		const mentorFundShare =
			form.getFieldValue("mentorFundShare") ?? DEFAULT_MENTOR_FUND_SHARE;

		if (
			mentorFundShare + DEFAULT_INVESTMENT_RESERVE >
			100 - PLATFORM_SHARE_PERCENT
		) {
			throw new Error(
				t(
					"modal.create-project.field.legalAllocation.error",
					"Mentor fund share cannot exceed the available project share after the platform share and the default reserve.",
				),
			);
		}
	};

	return (
		<>
			<Modal
				centered
				title={
					<Flex align="center" gap={8}>
						<PiRocketDuotone size={32} />
						{t("modal.create-project.title", "Create new game project")}
					</Flex>
				}
				width={720}
				destroyOnHidden
				maskClosable={false}
				open={open}
				onCancel={handleCancel}
				footer={[
					<Button key="cancel" onClick={handleCancel}>
						{t("modal.create-project.cancel-text", "Cancel")}
					</Button>,
					currentStep === 1 ? (
						<Button key="back" onClick={() => setCurrentStep(0)}>
							{t("Back")}
						</Button>
					) : null,
					currentStep === 0 ? (
						<Button
							key="continue"
							type="primary"
							onClick={handleContinue}
							loading={isCreateProcessing}
						>
							{t("Continue")}
						</Button>
					) : (
						<Button
							key="create"
							type="primary"
							onClick={handleCreate}
							loading={isCreateProcessing}
						>
							{t("modal.create-project.ok-text", "Create")}
						</Button>
					),
				]}
			>
				<Spin spinning={isCreateProcessing}>
					<Form
						form={form}
						variant="filled"
						layout="vertical"
						wrapperCol={{ span: 24 }}
						onFinish={() => {}}
						onFinishFailed={() => {}}
						autoComplete="off"
						requiredMark="optional"
						initialValues={{
							acceptRequirements: false,
							useCoDevelopmentAgreement: true,
							authorAgreementAccepted: false,
							mentorFundShare: DEFAULT_MENTOR_FUND_SHARE,
							damageCompensationEnabled: false,
							damageCompensationAmount: DEFAULT_DAMAGE_COMPENSATION_AMOUNT,
						}}
					>
						{currentStep === 0 ? (
							<>
								<Form.Item
									label={t("modal.create-project.field.name.label", "Title")}
									name="name"
									rules={[{ required: true }]}
								>
									<Input />
								</Form.Item>

								<Form.Item
									name="description"
									label={t(
										"modal.create-project.field.description.label",
										"Short Description",
									)}
								>
									<Input.TextArea
										rows={6}
										placeholder={t(
											"modal.create-project.field.description.placeholder",
											"This project about...",
										)}
									/>
								</Form.Item>

								<Flex
									align="center"
									justify="space-between"
									gap={16}
									style={{ paddingBlock: 4, marginBottom: 24 }}
								>
									<Text>
										{t(
											"modal.create-project.field.useAgreement.label",
											"Use co-development agreement for this project",
										)}
									</Text>
									<Space align="center" size={12}>
										<Text
											strong
											type={isCoDevelopmentEnabled ? "success" : "secondary"}
										>
											{isCoDevelopmentEnabled ? t("Enabled") : t("Disabled")}
										</Text>
										<Switch
											checked={isCoDevelopmentEnabled}
											onChange={handleAgreementToggle}
											checkedChildren={t("On")}
											unCheckedChildren={t("Off")}
										/>
									</Space>
								</Flex>

								<Alert
									type={isCoDevelopmentEnabled ? "info" : "warning"}
									message={
										isCoDevelopmentEnabled
											? t(
													"modal.create-project.legal.enabled",
													"Participants and mentors will join the project through the co-development agreement.",
												)
											: t(
													"modal.create-project.legal.disabled",
													"This project will be created without a co-development agreement.",
												)
									}
								/>
							</>
						) : (
							<>
								<Space
									direction="vertical"
									size={12}
									style={{ width: "100%", marginBottom: 16 }}
								>
									<Alert
										type={isCoDevelopmentEnabled ? "info" : "warning"}
										message={
											isCoDevelopmentEnabled
												? t(
														"modal.create-project.legal.info",
														"Configure the initial agreement terms for the project.",
													)
												: t(
														"modal.create-project.legal.noAgreementStep",
														"This project will be created without the co-development agreement. Only the platform requirements confirmation is needed.",
													)
										}
									/>
									<div>
										<Text strong>
											{t("modal.create-project.legal.title", "Agreement setup")}
										</Text>
										{isCoDevelopmentEnabled ? (
											<Paragraph type="secondary" style={{ marginBottom: 0 }}>
												{t(
													"modal.create-project.legal.description",
													"These parameters will be used in the project-specific appendix of the co-development agreement.",
												)}
											</Paragraph>
										) : null}
									</div>
								</Space>

								{isCoDevelopmentEnabled ? (
									<>
										<div style={{ marginBottom: 24 }}>
											<Text strong>
												{t(
													"modal.create-project.field.platformShare.label",
													"Platform share: {share}%",
													{ share: PLATFORM_SHARE_PERCENT },
												)}
											</Text>
											<Paragraph type="secondary" style={{ marginBottom: 0 }}>
												{t(
													"modal.create-project.field.platformShare.description",
													"It is fixed for the platform and cannot be changed.",
												)}
											</Paragraph>
										</div>

										<Form.Item
											name="mentorFundShare"
											label={t(
												"modal.create-project.field.mentorFund.label",
												"Mentor fund share",
											)}
											rules={[
												{ required: true },
												{
													type: "number",
													min: MIN_MENTOR_FUND_SHARE,
													message: t(
														"modal.create-project.field.mentorFund.error",
														"Mentor fund share cannot be less than 2%.",
													),
												},
												{
													validator: validateLegalAllocation,
												},
											]}
										>
											<InputNumber
												addonAfter="%"
												min={MIN_MENTOR_FUND_SHARE}
												max={
													100 -
													PLATFORM_SHARE_PERCENT -
													DEFAULT_INVESTMENT_RESERVE
												}
												style={{ width: "100%" }}
											/>
										</Form.Item>
										<Paragraph
											type="secondary"
											style={{ marginTop: -16, marginBottom: 24 }}
										>
											{t(
												"modal.create-project.field.mentorFund.description",
												"This share will be distributed between experts that the project consults with. Minimum: {min}%.",
												{ min: MIN_MENTOR_FUND_SHARE },
											)}
										</Paragraph>

										<Form.Item
											name="damageCompensationEnabled"
											label={
												<Flex align="center" gap={8}>
													<Text>
														{t(
															"modal.create-project.field.damageCompensation.enabled.label",
															"Enable damage compensation clause",
														)}
													</Text>
													<Tooltip
														title={t(
															"modal.create-project.field.damageCompensation.enabled.help",
															"When enabled, the agreement includes a fixed compensation clause for project damage.",
														)}
													>
														<AiOutlineQuestionCircle />
													</Tooltip>
												</Flex>
											}
											valuePropName="checked"
										>
											<Switch
												checkedChildren={t("On")}
												unCheckedChildren={t("Off")}
											/>
										</Form.Item>
										{damageCompensationEnabled ? (
											<Form.Item
												name="damageCompensationAmount"
												label={
													<Flex align="center" gap={8}>
														<Text>
															{t(
																"modal.create-project.field.damageCompensation.amount.label",
																"Damage compensation amount (USD)",
															)}
														</Text>
														<Tooltip
															title={t(
																"modal.create-project.field.damageCompensation.amount.help",
																"This amount is used in the legal appendix as the compensation value if the clause is enabled.",
															)}
														>
															<AiOutlineQuestionCircle />
														</Tooltip>
													</Flex>
												}
												rules={[
													{
														validator: (_, value) => {
															if (typeof value !== "number" || value <= 0) {
																return Promise.reject(
																	new Error(
																		t(
																			"modal.create-project.field.damageCompensation.amount.error",
																			"Damage compensation amount should be greater than 0.",
																		),
																	),
																);
															}

															return Promise.resolve();
														},
													},
												]}
											>
												<InputNumber
													min={1}
													precision={0}
													addonAfter={DEFAULT_DAMAGE_COMPENSATION_CURRENCY}
													style={{ width: "100%" }}
												/>
											</Form.Item>
										) : null}

										<Button onClick={() => setShowAgreementPreview(true)}>
											{t(
												"modal.create-project.previewAgreement",
												"Preview agreement",
											)}
										</Button>

										<Form.Item
											name="authorAgreementAccepted"
											valuePropName="checked"
											style={{ marginTop: 16 }}
											rules={[
												{
													validator: (_, value) =>
														value
															? Promise.resolve()
															: Promise.reject(
																	new Error(
																		t(
																			"modal.create-project.field.authorAgreementAccepted.error",
																			"The author should accept the co-development agreement",
																		),
																	),
																),
												},
											]}
										>
											<Checkbox className={styles.checkbox}>
												{t(
													"modal.create-project.field.authorAgreementAccepted.label",
													"I am the author of this project and I accept the co-development agreement.",
												)}
											</Checkbox>
										</Form.Item>
									</>
								) : null}

								<Form.Item
									name="acceptRequirements"
									valuePropName="checked"
									style={{ marginTop: 16 }}
									rules={[
										{
											validator: (_, value) =>
												value
													? Promise.resolve()
													: Promise.reject(
															new Error(
																t(
																	"modal.create-project.field.requirements.error",
																	"Should accept project requirements",
																),
															),
														),
										},
									]}
								>
									<Checkbox className={styles.checkbox}>
										{
											<T
												keyName="modal.create-project.field.requirements.label"
												defaultValue="I confirm that I have read and agree to the <a>requirements for game projects published on the gdhub.io platform</a>."
												params={{
													a: (
														// biome-ignore lint/a11y/useAnchorContent: link content is injected by Tolgee
														<a
															href={
																getLanguage() === "ru"
																	? "https://gdhub.notion.site/gdhub-io-157dcc9e9c9d805f8bace76c04d0a36b"
																	: "https://gdhub.notion.site/Requirements-for-game-projects-published-on-the-gdhub-io-platform-157dcc9e9c9d80c3ab0ae8d12035dc30"
															}
															target="_blank"
															rel="noreferrer"
															className={styles.link}
														/>
													),
												}}
											/>
										}
									</Checkbox>
								</Form.Item>
							</>
						)}
					</Form>
				</Spin>
			</Modal>

			<ProjectLegalPreviewModal
				open={showAgreementPreview}
				onClose={() => setShowAgreementPreview(false)}
				appendixInput={projectAppendixInput}
				showProjectAppendix
			/>
		</>
	);
};

export default CreateProjectModal;
