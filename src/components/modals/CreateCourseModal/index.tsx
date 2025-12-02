import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { PiRocketDuotone } from "@react-icons/all-files/pi/PiRocketDuotone";
import { useMutation } from "@tanstack/react-query";
import { T, useTolgee } from "@tolgee/react";
import { Flex, Form, Input, Modal, message, Select, Spin } from "antd";
import axios from "axios";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { gtmEventTrigger } from "@/helpers/gtm";
import { useWorkDirections } from "@/hooks/library";
import styles from "./style.module.scss";

const CreateCourseModal = ({ open, onCreate, onCancel }: any) => {
	const router = useRouter();
	const [form] = Form.useForm();
	const { t, getLanguage } = useTolgee();

	const {
		mutateAsync: createCourse,
		error: createCourseError,
		isPending: isCreateProcessing,
	} = useMutation({
		mutationFn: (data) =>
			axios.post<prismaClient.Course>("/api/user/course", data),
	});

	const { options: workDirections } = useWorkDirections();

	useEffect(() => {
		const error = createCourseError as any;
		if (error?.response?.data?.message) {
			message.error(error.response?.data?.message);
		}
	}, [createCourseError]);

	const handleOk = async () => {
		let data: any;

		try {
			data = await form.validateFields();
		} catch (error: any) {
			if (!Object.hasOwn(error, "errorFields")) {
				message.error(error.message);
				return;
			}
		}

		if (!data) return;

		const course = await createCourse(data);
		gtmEventTrigger("course_create", {
			courseId: course.data.id,
			name: course.data.name,
		});

		onCreate();
	};

	const handleCancel = () => {
		form.resetFields();
		onCancel();
	};

	return (
		<Modal
			centered
			title={
				<Flex align="center" gap={8}>
					<PiRocketDuotone size={32} />
					{t("modal.create-course.title", "Create new course")}
				</Flex>
			}
			width={640}
			destroyOnHidden
			maskClosable={false}
			okText={t("modal.create-course.ok-text", "Create")}
			cancelText={t("modal.create-course.cancel-text", "Cancel")}
			open={open}
			onOk={handleOk}
			onCancel={handleCancel}
			confirmLoading={isCreateProcessing}
		>
			<Spin spinning={isCreateProcessing}>
				<Form
					form={form}
					variant="filled"
					layout="vertical"
					wrapperCol={{ span: 12 }}
					onFinish={() => {}}
					onFinishFailed={() => {}}
					autoComplete="off"
					requiredMark="optional"
					initialValues={{ agree: false }}
				>
					<Form.Item
						label={t("modal.create-course.field.name.label", "Title")}
						name="name"
						rules={[{ required: true }]}
						wrapperCol={{ span: 24 }}
					>
						<Input />
					</Form.Item>

					<Form.Item
						name="description"
						label={t(
							"modal.create-course.field.description.label",
							"Short Description",
						)}
						wrapperCol={{ span: 24 }}
						rules={[{ required: true }]}
					>
						<Input.TextArea
							rows={6}
							placeholder={t(
								"modal.create-course.field.description.placeholder",
								"This course about...",
							)}
						/>
					</Form.Item>

					<Form.Item
						name="directionId"
						label={t("modal.create-course.field.direction.label", "Direction")}
						wrapperCol={{ span: 24 }}
						rules={[{ required: true }]}
					>
						<Select options={workDirections} />
					</Form.Item>

					<Form.Item
						name="language"
						label={t("modal.create-course.field.lang.label", "Language")}
						wrapperCol={{ span: 24 }}
						rules={[{ required: true }]}
					>
						<Select
							options={Object.values(prismaClient.$Enums.Language).map(
								(lang) => ({
									label: lang.toUpperCase(),
									value: lang,
								}),
							)}
						/>
					</Form.Item>
				</Form>
			</Spin>
		</Modal>
	);
};

export default CreateCourseModal;
