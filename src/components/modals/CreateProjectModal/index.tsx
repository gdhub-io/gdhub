import type { Project } from "@gdhub-io/gdhub-prisma";
import { useMutation } from "@tanstack/react-query";
import { useTolgee } from "@tolgee/react";
import { Checkbox, Form, Input, Modal, message, Spin } from "antd";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
	ClickwrapField,
	clickwrapFieldName,
	legalAcceptances,
	outdatedLegalCode,
} from "@/components/legal/ClickwrapField";
import { gtmEventTrigger } from "@/helpers/gtm";
import styles from "./style.module.scss";

const CreateProjectModal = ({ open, onCreate, onCancel }: any) => {
	const router = useRouter();
	const [form] = Form.useForm();
	const [stale, setStale] = useState(false);
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
			setStale(false);
			const { legal: _ticks, ...fields } = data;
			const project = await createProject({
				...fields,
				legal: legalAcceptances(["ProjectRequirements"]),
			});

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
			const outdated = outdatedLegalCode(error);
			if (outdated) {
				form.setFieldValue(clickwrapFieldName(outdated), false);
				setStale(true);
				return;
			}
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

					<ClickwrapField
						code="ProjectRequirements"
						stale={stale}
						requiredMessage={t(
							"legal.clickwrap.ProjectRequirements.required",
							"You need to accept the Project Requirements to create a project",
						)}
					/>
				</Form>
			</Spin>
		</Modal>
	);
};

export default CreateProjectModal;
