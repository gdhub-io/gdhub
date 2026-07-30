import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import {
	IconBookmark,
	IconCoinEuro,
	IconCurrencyEuro,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTolgee } from "@tolgee/react";
import {
	Checkbox,
	Flex,
	Form,
	Input,
	InputNumber,
	Modal,
	message,
	Select,
	Spin,
	Typography,
} from "antd";
import axios from "axios";
import { useRef } from "react";
import slugify from "slugify";
import styles from "./style.module.scss";

const { Text } = Typography;

interface CreateCourseFormValues {
	name: string;
	slug?: string;
	directionId: string;
	language: prismaClient.$Enums.Language;
	shortLine?: string;
	authorRate: number;
	agreedToTerms: boolean;
}

interface CreateCourseModalProps {
	open: boolean;
	onCancel: () => void;
	onCreate: (course: prismaClient.Course) => void;
}

const CreateCourseModal = ({
	open,
	onCancel,
	onCreate,
}: CreateCourseModalProps) => {
	const { t, getLanguage } = useTolgee();
	const [form] = Form.useForm<CreateCourseFormValues>();
	const slugManuallyEditedRef = useRef(false);

	const { data: directions = [], isLoading: isLoadingDirections } = useQuery({
		queryKey: ["dictionary", "work-directions"],
		queryFn: () =>
			axios
				.get<prismaClient.WorkDirection[]>("/api/dictionary/work-directions")
				.then((res) => res.data),
		staleTime: 5 * 60 * 1000,
	});

	const { mutateAsync: createCourse, isPending } = useMutation({
		mutationFn: (data: CreateCourseFormValues) =>
			axios.post<prismaClient.Course>("/api/user/course", data),
		onError: (error: any) => {
			const msg = error?.response?.data?.message;
			message.error(
				msg ||
					t(
						"modal.create-course.error",
						"Could not create the course. Please try again.",
					),
			);
		},
	});

	const handleNameChange = (value: string) => {
		if (slugManuallyEditedRef.current) return;
		form.setFieldValue(
			"slug",
			slugify(value || "", { lower: true, strict: true }),
		);
	};

	const handleSlugChange = () => {
		slugManuallyEditedRef.current = true;
	};

	const handleOk = async () => {
		let values: CreateCourseFormValues;
		try {
			values = await form.validateFields();
		} catch {
			return;
		}

		const result = await createCourse({
			name: values.name.trim(),
			slug: values.slug?.trim() || undefined,
			shortLine: values.shortLine?.trim() || undefined,
			directionId: values.directionId,
			language: values.language,
			authorRate: Number(values.authorRate),
			agreedToTerms: values.agreedToTerms,
		});

		message.success(
			t("modal.create-course.success", "Course created as draft"),
		);
		form.resetFields();
		onCreate(result.data);
	};

	const handleCancel = () => {
		form.resetFields();
		onCancel();
	};

	return (
		<Modal
			centered
			width={580}
			destroyOnHidden
			mask={{ closable: false }}
			open={open}
			title={
				<Flex vertical gap={2}>
					<Text strong style={{ fontSize: 16 }}>
						{t("modal.create-course.title", "New course")}
					</Text>
					<Text type="secondary" style={{ fontSize: 12 }}>
						{t(
							"modal.create-course.subtitle",
							"We'll create a draft you can polish in Settings",
						)}
					</Text>
				</Flex>
			}
			okText={t("modal.create-course.ok", "Create course")}
			cancelText={t("modal.create-course.cancel", "Cancel")}
			onOk={handleOk}
			onCancel={handleCancel}
			confirmLoading={isPending}
		>
			<Spin spinning={isPending}>
				<Form
					form={form}
					layout="vertical"
					requiredMark="optional"
					initialValues={{
						language:
							getLanguage() === "ru"
								? "ru"
								: ("en" as prismaClient.$Enums.Language),
						authorRate: 20,
						agreedToTerms: false,
					}}
				>
					<Form.Item
						name="name"
						label={t("modal.create-course.field.name", "Course name")}
						rules={[{ required: true, min: 4 }]}
					>
						<Input
							variant="filled"
							placeholder={t(
								"modal.create-course.field.name.placeholder",
								"e.g. 3D Modeling for Stylized Characters",
							)}
							onChange={(e) => handleNameChange(e.target.value)}
						/>
					</Form.Item>

					<Form.Item
						name="slug"
						label={t("modal.create-course.field.slug", "Slug")}
						extra={t(
							"modal.create-course.field.slug.hint",
							"Auto-generated from the name · you can change it later",
						)}
						normalize={(value: string) =>
							slugify(value || "", { lower: true, strict: true })
						}
					>
						<Input
							variant="filled"
							prefix="/course/"
							onChange={handleSlugChange}
						/>
					</Form.Item>

					<Flex gap={12}>
						<Form.Item
							name="directionId"
							label={t("modal.create-course.field.direction", "Direction")}
							rules={[{ required: true }]}
							style={{ flex: 1 }}
						>
							<Select
								variant="filled"
								loading={isLoadingDirections}
								placeholder={t(
									"modal.create-course.field.direction.placeholder",
									"Select a direction",
								)}
								options={directions.map((d) => ({
									value: d.id,
									label: d.name,
								}))}
							/>
						</Form.Item>
						<Form.Item
							name="language"
							label={t("modal.create-course.field.language", "Language")}
							rules={[{ required: true }]}
							style={{ width: 180 }}
						>
							<Select
								variant="filled"
								options={[
									{ value: "en", label: "English" },
									{ value: "ru", label: "Russian" },
								]}
							/>
						</Form.Item>
					</Flex>

					<Form.Item
						name="shortLine"
						label={t(
							"modal.create-course.field.shortLine",
							"Short description",
						)}
					>
						<Input.TextArea
							variant="filled"
							rows={2}
							maxLength={200}
							showCount
							placeholder={t(
								"modal.create-course.field.shortLine.placeholder",
								"One sentence about what students will learn",
							)}
						/>
					</Form.Item>

					<Form.Item
						name="authorRate"
						label={t(
							"modal.create-course.field.authorRate",
							"Your teaching rate (EUR/hour)",
						)}
						rules={[{ required: true, type: "number", min: 0 }]}
						extra={t(
							"modal.create-course.field.authorRate.hint",
							"Used to estimate the breakeven price for the course",
						)}
					>
						<InputNumber
							variant="filled"
							addonBefore={<IconCurrencyEuro size={16} />}
							addonAfter="hour of teaching"
							min={0}
							step={5}
						/>
					</Form.Item>

					<Form.Item
						name="agreedToTerms"
						valuePropName="checked"
						wrapperCol={{ xs: { span: 24, offset: 0 } }}
						rules={[
							{
								validator: (_, value) =>
									value
										? Promise.resolve()
										: Promise.reject(
												new Error(
													t(
														"modal.create-course.field.agreedToTerms.error",
														"You must agree to the platform terms",
													),
												),
											),
							},
						]}
					>
						<Checkbox>
							{t("modal.create-course.field.agreedToTerms", "I agree to the")}{" "}
							<a
								href="https://gdhub.notion.site/course-agreement"
								target="_blank"
								rel="noreferrer"
							>
								{t(
									"modal.create-course.field.agreedToTerms.link",
									"Course Agreement & Payouts Policy",
								)}
							</a>
							.
						</Checkbox>
					</Form.Item>
				</Form>
			</Spin>
		</Modal>
	);
};

export default CreateCourseModal;
