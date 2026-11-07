import type { Project } from "@gdhub-io/gdhub-prisma";
import { useMutation } from "@tanstack/react-query";
import { useTolgee } from "@tolgee/react";
import { App, Checkbox, Flex, Form, Input, Modal, Select, Spin } from "antd";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
	ClickwrapField,
	clickwrapFieldName,
	legalAcceptances,
	outdatedLegalCode,
} from "@/components/legal/ClickwrapField";
import { gtmEventTrigger } from "@/helpers/gtm";
import { projectSpaceHref } from "@/helpers/project-space";
import { useRateLimitWarning } from "@/hooks/checkpoint-entry";
import { useGameGenres } from "@/hooks/library";
import { genreOptions } from "./genres";
import styles from "./style.module.scss";

/**
 * The stages of the default workflow a new project may be placed on. Never
 * Introduction — a checkpoint is not bought there — and nothing after release.
 * The server checks the name against the template.
 */
const NEW_PROJECT_STAGES = [
	"Ideation",
	"Concepting",
	"Prototyping",
	"Preparing a demo version",
	"Taking and analyzing metrics",
	"Preparing a release version",
] as const;

export type CreatedProject = Project & { stage: string };

export type CreateProjectModalProps = {
	open: boolean;
	onCancel: () => void;
	/**
	 * `checkpoint` is the way into a checkpoint (12.2d): it stays on the page and
	 * hands the project to `onCreated` instead of opening it.
	 */
	variant?: "default" | "checkpoint";
	onCreated?: (project: CreatedProject) => void;
};

const CreateProjectModal = ({
	open,
	onCancel,
	variant = "default",
	onCreated,
}: CreateProjectModalProps) => {
	const router = useRouter();
	const [form] = Form.useForm();
	const [stale, setStale] = useState(false);
	const { t } = useTolgee();
	const { message } = App.useApp();
	const genres = useGameGenres();
	const checkpoint = variant === "checkpoint";
	const warnRateLimited = useRateLimitWarning();

	const { mutateAsync: createProject, isPending: isCreateProcessing } =
		useMutation({
			mutationFn: (data: Record<string, unknown>) =>
				axios.post<CreatedProject>("/api/user/project", data),
		});

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

			if (onCreated) {
				form.resetFields();
				onCreated(project.data);
			}
			if (!checkpoint) router.push(projectSpaceHref(project.data.slug));
		} catch (error: any) {
			if (warnRateLimited(error)) return;
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
			// A 4xx carries a reason worth showing; anything else gets the generic line.
			const status = error?.response?.status;
			const reason =
				status && status < 500
					? (error.response.data?.message ?? error.response.data?.error)
					: undefined;
			message.error(
				reason ??
					t(
						"modal.create-project.failed",
						"Could not create the project — try again",
					),
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
			title={
				checkpoint
					? t("modal.create-project.checkpoint.title", "New project")
					: t("modal.create-project.title", "Create new game project")
			}
			width={640}
			destroyOnHidden
			mask={{ closable: false }}
			okText={
				checkpoint
					? t("modal.create-project.checkpoint.ok", "Create project")
					: t("modal.create-project.ok-text", "Create")
			}
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
					initialValues={{ stage: NEW_PROJECT_STAGES[0] }}
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
							"modal.create-project.field.description.pitch",
							"What's the game about",
						)}
						rules={[{ required: true }]}
						wrapperCol={{ span: 24 }}
					>
						<Input.TextArea
							rows={4}
							placeholder={t(
								"modal.create-project.field.description.placeholder",
								"This project about...",
							)}
						/>
					</Form.Item>

					<Flex gap={16} wrap className={styles.pair}>
						<Form.Item
							name="genre"
							label={t("modal.create-project.field.genre.label", "Genre")}
							rules={[{ required: true }]}
							validateStatus={genres.isError ? "error" : undefined}
							help={
								genres.isError
									? t(
											"modal.create-project.field.genre.failed",
											"Genres could not be loaded",
										)
									: undefined
							}
							wrapperCol={{ span: 24 }}
						>
							<Select
								showSearch
								loading={!genres.data && !genres.isError}
								status={genres.isError ? "error" : undefined}
								options={genreOptions(
									genres.data?.map(({ name }) => name) ?? [],
									t,
								)}
							/>
						</Form.Item>

						<Form.Item
							name="stage"
							label={t(
								"checkpoints.now.stageWhere",
								"Where is the project now?",
							)}
							extra={t(
								"checkpoints.now.stageWhereHelp",
								"We'll set the project on this stage; earlier stages are marked done.",
							)}
							rules={[{ required: true }]}
							wrapperCol={{ span: 24 }}
						>
							<Select
								options={NEW_PROJECT_STAGES.map((stage) => ({
									value: stage,
									label: stage,
								}))}
							/>
						</Form.Item>
					</Flex>

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
