import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Card,
	Col,
	Form,
	Input,
	InputNumber,
	message,
	Row,
	Space,
	Spin,
	Typography,
} from "antd";
import { useEffect, useState } from "react";

const { Text } = Typography;

type ResourcesProfileFormArgs = {
	profile: prismaClient.Profile;
	saveProfile: (data: Partial<prismaClient.Profile>) => Promise<void>;
};

const ResourcesProfileForm = ({ profile, saveProfile }: ResourcesProfileFormArgs) => {
	const [form] = Form.useForm();
	const { t } = useTranslate();
	const [processing, setProcessing] = useState(true);

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
	}, [profile, form]);

	const handleForm = async () => {
		try {
			const { timeForWorkMin, timeForWorkMax, otherResources } = await form.validateFields();
			const timeForWork: number[] = [timeForWorkMin, timeForWorkMax];

			setProcessing(true);
			await saveProfile({ timeForWork, otherResources });
			setProcessing(false);

			message.success(t("profile-forms.resources.update-message", "Resource data updated"));
		} catch {
			setProcessing(false);
		}
	};

	return (
		<Card title={t("profile-forms.resources.card.title", "Resources")} bordered={false}>
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
									<Text>{t("profile-forms.resources.field.timeForWork.from", "From")} </Text>
									<Form.Item name="timeForWorkMin" noStyle rules={[{ required: true }]}>
										<InputNumber min={1} max={55} placeholder={t("minimum")} />
									</Form.Item>
									<Text>{t("profile-forms.resources.field.timeForWork.to", "to")}</Text>
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
										<InputNumber min={2} max={56} placeholder={t("maximum")} />
									</Form.Item>
									<Text>
										{" "}
										{t("profile-forms.resources.field.timeForWork.hoursAWeek", "hours a week")}
									</Text>
								</Space>
							</Col>
						</Row>
					</Form.Item>

					<Form.Item
						label={t("profile-forms.resources.field.other-resources.label", "Other resources")}
						name="otherResources"
					>
						<Input.TextArea rows={2} />
					</Form.Item>

					<Button type="primary" onClick={handleForm} loading={processing}>
						{t("profile-forms.resources.card.save", "Save")}
					</Button>
				</Form>
			</Spin>
		</Card>
	);
};

export default ResourcesProfileForm;
