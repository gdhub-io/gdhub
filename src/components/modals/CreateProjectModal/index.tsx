import type { Project } from "@gdhub-io/gdhub-prisma";
import { useMutation } from "@tanstack/react-query";
import { T, useTolgee } from "@tolgee/react";
import { Checkbox, Flex, Form, Input, Modal, message, Spin } from "antd";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { gtmEventTrigger } from "@/helpers/gtm";
import styles from "./style.module.scss";

const CreateProjectModal = ({ open, onCreate, onCancel }: any) => {
	const router = useRouter();
	const [form] = Form.useForm();
	const { t, getLanguage } = useTolgee();

	const {
		mutateAsync: createProject,
		error: createProjectError,
		isPending: isCreateProcessing,
	} = useMutation({
		mutationFn: (data) => axios.post<Project>("/api/user/project", data),
	});

	useEffect(() => {
		const error = createProjectError as any;
		if (error?.response?.data?.message) {
			message.error(error.response?.data?.message);
		}
	}, [createProjectError]);

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

		try {
			// Both confirmations are required by the API; `understandsNotAi` is a
			// creation-time gate there too and is not stored.
			const project = await createProject(data);

			// Advisory AI warnings (e.g. a weak description) — shown, not blocking.
			const warnings = (project.data as any)?.validation?.warnings ?? [];
			for (const warning of warnings) {
				message.warning(t(warning.messageKey, warning.message));
			}

			gtmEventTrigger("project_create", {
				projectId: project.data.id,
				name: project.data.name,
			});

			router.push("/user/project/" + project.data.slug);
		} catch (error: any) {
			// Blocking AI errors (irrelevant / offensive) — attach to the fields.
			const validationErrors = error?.response?.data?.validation?.errors;
			if (validationErrors?.length) {
				form.setFields(
					validationErrors.map((issue: any) => ({
						name: issue.key,
						errors: [t(issue.messageKey, issue.message)],
					})),
				);
				return;
			}
			message.error(
				error?.response?.data?.error ??
					error?.response?.data?.message ??
					error.message,
			);
		}
	};

	const handleCancel = () => {
		form.resetFields();
		onCancel();
	};

	return (
		<Modal
			centered
			title={t("modal.create-project.title", "Create new game project")}
			width={640}
			destroyOnHidden
			mask={{ closable: false }}
			okText={t("modal.create-project.ok-text", "Create")}
			cancelText={t("modal.create-project.cancel-text", "Cancel")}
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
						label={t("modal.create-project.field.name.label", "Title")}
						name="name"
						rules={[{ required: true }]}
						wrapperCol={{ span: 24 }}
					>
						<Input />
					</Form.Item>

					<Form.Item
						name="description"
						label={t(
							"modal.create-project.field.description.label",
							"Short Description",
						)}
						wrapperCol={{ span: 24 }}
					>
						<Input.TextArea
							rows={6}
							placeholder={t(
								"modal.create-project.field.description.placeholder",
								"This project about...",
							)}
						/>
					</Form.Item>

					{/* People have arrived here expecting to describe a game and have one
					    generated. Saying so plainly, before the requirements checkbox,
					    is cheaper than the support conversation afterwards. It gates
					    the form and is deliberately not persisted. */}
					<Form.Item
						name="understandsNotAi"
						className={styles.consentItem}
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
														"modal.create-project.field.not-ai.error",
														"Please confirm you are making the game yourself",
													),
												),
											),
							},
						]}
					>
						<Checkbox>
							{t(
								"modal.create-project.field.not-ai.label",
								"I confirm that I am making this game myself or with my team, and I understand this form is not an AI prompt — describing a game here will not generate one :)",
							)}
						</Checkbox>
					</Form.Item>

					<Form.Item
						name="agree"
						className={styles.consentItem}
						valuePropName="checked"
						wrapperCol={{
							xs: {
								span: 24,
								offset: 0,
							},
						}}
						rules={[
							{
								validator: (_, value) =>
									value
										? Promise.resolve()
										: Promise.reject(
												new Error(
													t(
														"modal.create-project.field.agree.error",
														"Should accept requirements",
													),
												),
											),
							},
						]}
					>
						<Checkbox>
							{
								<T
									keyName="modal.create-project.field.agree.label"
									defaultValue="I confirm that I have read and agree to the <a href='/project-requirements'>requirements for game projects published on the gdhub.io platform</a>."
									params={{
										a: (
											<Link
												href="/project-requirements"
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
				</Form>
			</Spin>
		</Modal>
	);
};

export default CreateProjectModal;
