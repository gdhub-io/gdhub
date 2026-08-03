import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Checkbox,
	Col,
	Form,
	Input,
	InputNumber,
	message,
	Row,
	Space,
	Typography,
} from "antd";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { resyncSession } from "@/helpers/session";
import styles from "./style.module.scss";

const { Paragraph, Title, Text } = Typography;

interface IOnboardingResourceStep {
	onSave: () => void;
	onPreviousStep: () => void;
	onLoading?: () => void;
}

export const OnboardingResourceStep = ({
	onSave,
	onLoading = () => {},
	onPreviousStep = () => {},
}: IOnboardingResourceStep) => {
	const [form] = Form.useForm();
	const { t } = useTranslate();
	const { data: session, update: updateSession } = useSession();

	const { data: profileData } = useQuery({
		queryKey: ["profile", session?.user.id],
		queryFn: () =>
			axios.get<any>("/api/auth/registration/onboarding/resources"),
		enabled: !!session?.user.id,
		refetchInterval: false,
		refetchOnWindowFocus: false,
	});

	useEffect(() => {
		if (!profileData?.data) return;

		const { timeForWork, isActive, otherResources } = profileData.data;

		const hasTimeForWork = timeForWork && timeForWork.length === 2;

		form.setFieldsValue({
			timeForWorkMin: hasTimeForWork ? timeForWork[0] : undefined,
			timeForWorkMax: hasTimeForWork ? timeForWork[1] : undefined,
			isActive,
			otherResources,
		});

		onLoading();
	}, [profileData?.data]);

	const { mutateAsync: saveUserResources, isPending: isSaving } = useMutation({
		mutationFn: (data: any) =>
			axios.put<any>("/api/auth/registration/onboarding/resources", data),
	});

	const handleSave = async () => {
		try {
			const { timeForWorkMin, timeForWorkMax, isActive, otherResources } =
				await form.validateFields();

			await saveUserResources({
				isActive,
				otherResources,
				timeForWork:
					timeForWorkMin && timeForWorkMax
						? [timeForWorkMin, timeForWorkMax]
						: undefined,
			});

			// The proxy gates the whole app on `onboardingDone` in the JWT, so the
			// token has to be re-read before leaving this step.
			await resyncSession(updateSession);

			onSave();
		} catch (error: any) {
			if (!error.response || !error.message) return;

			message.error(error.response?.data?.message || error.message);
		}
	};

	return (
		<div className={styles.container}>
			<div className="onboarding-content">
				<div className="onboarding-form">
					<div className="onboarding-form-title">
						<Title level={2}>
							{t("onboarding.resources.title", "Recources")}
						</Title>
						<Paragraph italic>
							{t(
								"onboarding.resources.description",
								"How can you be useful to teams?",
							)}
						</Paragraph>
						<Paragraph italic type="secondary">
							{t(
								"onboarding.resources.description2",
								"The main resource is your time, which you are willing to spend on participating in projects. You can also provide additional information",
							)}
						</Paragraph>
					</div>

					<Form
						form={form}
						layout="vertical"
						variant="filled"
						requiredMark="optional"
						autoComplete="off"
						scrollToFirstError
						initialValues={{ isActive: true }}
					>
						<Space direction="vertical" size={16} style={{ width: "100%" }}>
							<Form.Item
								label={t(
									"onboarding.resources.availableTime",
									"Available time",
								)}
								tooltip={{
									title: t("How many hours a week can you devote to projects?"),
								}}
								wrapperCol={{ span: 24 }}
								required
								valuePropName="value"
							>
								<Row>
									<Col md={{ span: 12 }} xs={{ span: 24 }}>
										<Space>
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
											<Text>—</Text>
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
											<Text>{t("hours-a-week", "hours a week")}</Text>
										</Space>
									</Col>
								</Row>
							</Form.Item>

							<Form.Item name="isActive" valuePropName="checked">
								<Checkbox>
									{t(
										"onboarding.resources.availableForOffering",
										"I&apos;m available for offering",
									)}
								</Checkbox>
							</Form.Item>

							<Form.Item
								name="otherResources"
								label={t(
									"onboarding.resources.additionalInformation",
									"Additional information",
								)}
							>
								<Input.TextArea rows={8} />
							</Form.Item>
						</Space>
					</Form>
				</div>
				<div className="onboarding-footer">
					<Button onClick={onPreviousStep}>
						{t("onboarding.resources.back", "Back")}
					</Button>
					<Button type="primary" onClick={handleSave} loading={isSaving}>
						{t("onboarding.resources.save", "Save")}
					</Button>
				</div>
			</div>
		</div>
	);
};
