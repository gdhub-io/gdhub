import { AiOutlineQuestionCircle } from "@react-icons/all-files/ai/AiOutlineQuestionCircle";
import { T, useTolgee } from "@tolgee/react";
import {
	Button,
	Checkbox,
	Flex,
	Form,
	InputNumber,
	Space,
	Switch,
	Tooltip,
	Typography,
} from "antd";
import { forwardRef, useImperativeHandle } from "react";
import {
	DEFAULT_DAMAGE_COMPENSATION_CURRENCY,
	DEFAULT_INVESTMENT_RESERVE,
	MIN_MENTOR_FUND_SHARE,
	PLATFORM_SHARE_PERCENT,
} from "@/config/legal";
import styles from "./style.module.scss";
import type { CreateProjectStepTwoValues } from "./types";

const { Paragraph, Text, Title } = Typography;

export type StepTwoFormRef = {
	validate: () => Promise<CreateProjectStepTwoValues>;
	getValues: () => CreateProjectStepTwoValues;
	reset: () => void;
};

type StepTwoFormProps = {
	initialValues: CreateProjectStepTwoValues;
	isCoDevelopmentEnabled: boolean;
	onPreviewAgreement: () => void;
	onValuesChange: (values: CreateProjectStepTwoValues) => void;
};

const StepTwoForm = forwardRef<StepTwoFormRef, StepTwoFormProps>(
	(
		{
			initialValues,
			isCoDevelopmentEnabled,
			onPreviewAgreement,
			onValuesChange,
		},
		ref,
	) => {
		const [form] = Form.useForm<CreateProjectStepTwoValues>();
		const { t, getLanguage } = useTolgee();
		const damageCompensationEnabled =
			Form.useWatch("damageCompensationEnabled", form) ?? false;

		useImperativeHandle(ref, () => ({
			validate: async () => form.validateFields(),
			getValues: () => form.getFieldsValue(true),
			reset: () => form.resetFields(),
		}));

		const validateLegalAllocation = async () => {
			const mentorFundShare = form.getFieldValue("mentorFundShare");
			if (
				typeof mentorFundShare === "number" &&
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
			<Form
				form={form}
				variant="filled"
				layout="vertical"
				wrapperCol={{ span: 24 }}
				autoComplete="off"
				requiredMark="optional"
				initialValues={initialValues}
				onValuesChange={(_, values) => {
					onValuesChange(values as CreateProjectStepTwoValues);
				}}
			>
				<Space direction="vertical" size={0}>
					{isCoDevelopmentEnabled ? (
						<>
							<Title level={3}>
								{t(
									"modal.create-project.legal.title",
									"Co-development agreement setup",
								)}
							</Title>
							<Paragraph type="secondary" style={{ marginBottom: 16 }}>
								{t(
									"modal.create-project.legal.description",
									"These parameters will be used in the project-specific appendix of the co-development agreement. Platform share is fixed {share}% and cannot be changed.",
									{ share: PLATFORM_SHARE_PERCENT },
								)}
							</Paragraph>
						</>
					) : (
						<Title level={3}>
							{t(
								"modal.create-project.legal.noCoDevelopment.title",
								"Agreements",
							)}
						</Title>
					)}
				</Space>

				{isCoDevelopmentEnabled ? (
					<>
						<Form.Item
							name="mentorFundShare"
							label={t(
								"modal.create-project.field.mentorFund.label",
								"Mentor fund share",
							)}
							tooltip={{
								title: t(
									"modal.create-project.field.mentorFund.help",
									"It's help you have access to the expert's knowledge and experience. This share will be distributed between experts that the project consults with. Minimum: {min}%.",
									{ min: MIN_MENTOR_FUND_SHARE },
								),
							}}
							rules={[
								{ required: true },
								{
									type: "number",
									min: MIN_MENTOR_FUND_SHARE,
									message: t(
										"modal.create-project.field.mentorFund.error",
										"Mentor fund share cannot be less than {min}%.",
										{ min: MIN_MENTOR_FUND_SHARE },
									),
								},
								{ validator: validateLegalAllocation },
							]}
						>
							<InputNumber
								addonAfter="%"
								min={MIN_MENTOR_FUND_SHARE}
								max={100 - PLATFORM_SHARE_PERCENT - DEFAULT_INVESTMENT_RESERVE}
								style={{ width: "100%" }}
							/>
						</Form.Item>

						<Form.Item
							name="damageCompensationEnabled"
							label={t(
								"modal.create-project.field.damageCompensation.enabled.label",
								"Enable damage compensation clause",
							)}
							valuePropName="checked"
							required
							tooltip={{
								title: t(
									"modal.create-project.field.damageCompensation.enabled.help",
									"When enabled, the agreement includes a fixed compensation clause for project damage.",
								),
							}}
						>
							<Switch checkedChildren={t("On")} unCheckedChildren={t("Off")} />
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
								required
								rules={[
									{
										required: true,
										message: t(
											"modal.create-project.field.damageCompensation.amount.error",
											"Damage compensation amount is required",
										),
									},
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

						<Button onClick={onPreviewAgreement}>
							{t("modal.create-project.previewAgreement", "Preview agreement")}
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
					</Checkbox>
				</Form.Item>
			</Form>
		);
	},
);

StepTwoForm.displayName = "StepTwoForm";

export default StepTwoForm;
