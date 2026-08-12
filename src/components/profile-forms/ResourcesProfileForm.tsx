import type { Profile } from "@gdhub-io/gdhub-prisma";
import { IconInfoCircle } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	Card,
	Col,
	Form,
	Input,
	InputNumber,
	message,
	Row,
	Space,
	Spin,
	Switch,
	Tooltip,
	Typography,
} from "antd";
import { useEffect, useState } from "react";
import styles from "./resourcesProfileForm.module.scss";
import { SettingsActions } from "./SettingsActions";

const { Text } = Typography;

type ResourcesProfileFormArgs = {
	profile: Profile;
	saveProfile: (data: Partial<Profile>) => Promise<void>;
};

const ResourcesProfileForm = ({
	profile,
	saveProfile,
}: ResourcesProfileFormArgs) => {
	const [form] = Form.useForm();
	const { t } = useTranslate();
	const [processing, setProcessing] = useState(true);

	/**
	 * "Available for offers" — this is the page that says what a person can give
	 * to a project: hours a week, other resources, and whether they are open to
	 * being approached at all.
	 *
	 * Optimistic: a switch that waits for the round trip reads as broken, and the
	 * only cost of being wrong is one refetch.
	 */
	const [available, setAvailable] = useState<boolean>(
		profile?.isActive ?? true,
	);
	const [isSavingAvailability, setSavingAvailability] = useState(false);

	const setAvailability = async (isActive: boolean) => {
		setSavingAvailability(true);
		try {
			await saveProfile({ isActive });
		} catch {
			setAvailable((value) => !value);
			message.error(
				t("profile-forms.resources.availability.error", "Could not save"),
			);
		} finally {
			setSavingAvailability(false);
		}
	};

	useEffect(() => {
		if (profile) {
			setProcessing(false);

			if (profile.timeForWork && Array.isArray(profile.timeForWork)) {
				form.setFieldsValue({
					timeForWorkMin: profile.timeForWork[0],
					timeForWorkMax: profile.timeForWork[1],
				});
			}
		}
	}, [profile]);

	const handleForm = async () => {
		try {
			const { timeForWorkMin, timeForWorkMax, otherResources } =
				await form.validateFields();
			const timeForWork: number[] = [timeForWorkMin, timeForWorkMax];

			setProcessing(true);
			await saveProfile({ timeForWork, otherResources });
			setProcessing(false);

			message.success(
				t("profile-forms.resources.update-message", "Resource data updated"),
			);
		} catch (error: any) {
			setProcessing(false);
		}
	};

	return (
		<>
			<Card
				title={t("profile-forms.resources.card.title", "Resources")}
				variant="borderless"
				extra={
					<Space size={8}>
						<Text type="secondary">
							{t(
								"profile-forms.resources.availability",
								"Available for offers",
							)}
						</Text>
						<Tooltip
							title={t(
								"profile-forms.resources.availability.hint",
								"While this is on, your specialties appear in the Talent Pool and project authors can find and invite you.",
							)}
						>
							{/* A span, not the icon itself: antd attaches its hover handlers
							    and ref to the child, and an SVG is an unreliable host for
							    both. */}
							<span className={styles.hint}>
								<IconInfoCircle size={15} />
							</span>
						</Tooltip>
						<Switch
							size="small"
							checked={available}
							loading={isSavingAvailability}
							onChange={(checked) => {
								setAvailable(checked);
								setAvailability(checked);
							}}
						/>
					</Space>
				}
			>
				<Spin spinning={processing}>
					<Form
						form={form}
						layout="vertical"
						variant="filled"
						name="profile-resources-form"
						wrapperCol={{ span: 12 }}
						autoComplete="off"
						requiredMark="optional"
						initialValues={{ otherResources: profile?.otherResources }}
					>
						<Form.Item
							label={t(
								"profile-forms.resources.field.timeForWork.title",
								"Available time (per week)",
							)}
							tooltip={{
								title: t(
									"profile-forms.resources.field.timeForWork.tooltip",
									"How many hours a week can you pay to participation in projects.",
								),
							}}
							wrapperCol={{ span: 24 }}
							required
							valuePropName="value"
						>
							<Row>
								<Col md={{ span: 12 }} xs={{ span: 24 }}>
									<Space>
										<Text>
											{t(
												"profile-forms.resources.field.timeForWork.from",
												"From",
											)}{" "}
										</Text>
										<Form.Item
											name="timeForWorkMin"
											noStyle
											rules={[{ required: true }]}
										>
											<InputNumber
												min={1}
												max={55}
												placeholder={t("minimum")}
											/>
										</Form.Item>
										<Text>
											{t("profile-forms.resources.field.timeForWork.to", "to")}
										</Text>
										<Form.Item
											name="timeForWorkMax"
											noStyle
											rules={[
												{ required: true },
												{
													validator: (_, value) =>
														form.getFieldValue("timeForWorkMin") > value
															? Promise.reject(
																	t(
																		"profile-forms.resources.field.timeForWorkMax.error",
																		"The maximum value cannot be less than the minimum",
																	),
																)
															: Promise.resolve(),
												},
											]}
										>
											<InputNumber
												min={2}
												max={56}
												placeholder={t("maximum")}
											/>
										</Form.Item>
										<Text>
											{" "}
											{t(
												"profile-forms.resources.field.timeForWork.hoursAWeek",
												"hours a week",
											)}
										</Text>
									</Space>
								</Col>
							</Row>
						</Form.Item>

						<Form.Item
							label={t(
								"profile-forms.resources.field.other-resources.label",
								"Other resources",
							)}
							name="otherResources"
						>
							<Input.TextArea rows={2} />
						</Form.Item>
					</Form>
				</Spin>
			</Card>

			<SettingsActions onSave={handleForm} loading={processing} />
		</>
	);
};

export default ResourcesProfileForm;
