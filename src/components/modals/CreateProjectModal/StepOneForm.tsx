import { IconInfoCircle } from "@tabler/icons-react";
import { useTolgee } from "@tolgee/react";
import { Flex, Form, Input, Space, Switch, Tooltip, Typography } from "antd";
import { forwardRef, useImperativeHandle } from "react";
import type { CreateProjectStepOneValues } from "./types";

const { Text } = Typography;

export type StepOneFormRef = {
	validate: () => Promise<CreateProjectStepOneValues>;
	getValues: () => CreateProjectStepOneValues;
	reset: () => void;
};

type StepOneFormProps = {
	initialValues: CreateProjectStepOneValues;
	onValuesChange: (values: CreateProjectStepOneValues) => void;
};

const StepOneForm = forwardRef<StepOneFormRef, StepOneFormProps>(
	({ initialValues, onValuesChange }, ref) => {
		const [form] = Form.useForm<CreateProjectStepOneValues>();
		const { t } = useTolgee();
		const isCoDevelopmentEnabled =
			Form.useWatch("useCoDevelopmentAgreement", form) ?? false;

		useImperativeHandle(ref, () => ({
			validate: async () => form.validateFields(),
			getValues: () => form.getFieldsValue(true),
			reset: () => form.resetFields(),
		}));

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
					onValuesChange(values as CreateProjectStepOneValues);
				}}
			>
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
					<Space align="center">
						<Text>
							{t(
								"modal.create-project.field.useAgreement.label",
								"Use co-development agreement for this project",
							)}
						</Text>
						<Tooltip
							title={t(
								"modal.create-project.field.useAgreement.help",
								"When enabled, the project will be created with a co-development agreement. Participants and mentors will join the project through the co-development agreement.",
							)}
						>
							<IconInfoCircle size={18} />
						</Tooltip>
					</Space>
					<Space align="center" size={12}>
						<Form.Item
							name="useCoDevelopmentAgreement"
							valuePropName="checked"
							noStyle
						>
							<Switch
								checked={isCoDevelopmentEnabled}
								checkedChildren={t("On")}
								unCheckedChildren={t("Off")}
							/>
						</Form.Item>
					</Space>
				</Flex>
			</Form>
		);
	},
);

StepOneForm.displayName = "StepOneForm";

export default StepOneForm;
