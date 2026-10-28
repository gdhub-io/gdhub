"use client";

import { IconInfoCircle } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	Alert,
	App,
	Flex,
	Form,
	Input,
	Modal,
	Segmented,
	Select,
	Typography,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import { useState } from "react";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import {
	useFreeCheckpointProjects,
	useStartFreeCheckpoint,
} from "@/hooks/admin-checkpoints";
import { useFirstCalls } from "@/hooks/advisor-availability";
import { useUserSearch } from "@/hooks/user-search";

/** How far ahead a person's first call is offered. */
const FIRST_CALL_DAYS = 14;

/**
 * Frame 12.11.12: an administrator starts a checkpoint for free on an active
 * project past Introduction. Its goal is the stage's own, for the author to
 * rewrite on day 1; it then starts as a free draft does.
 */
export function FreeCheckpointModal({ onClose }: { onClose: () => void }) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const [form] = Form.useForm();
	const [kind, setKind] = useState<CheckpointCuratorKind>(
		CheckpointCuratorKind.AI,
	);
	const [query, setQuery] = useState("");
	const projectId = Form.useWatch("projectId", form);
	const curatorId = Form.useWatch("userId", form);
	const human = kind === CheckpointCuratorKind.Human;

	const projects = useFreeCheckpointProjects(query);
	const userSearch = useUserSearch(human);
	const from = dayjs().add(1, "day").format("YYYY-MM-DD");
	const to = dayjs().add(FIRST_CALL_DAYS, "day").format("YYYY-MM-DD");
	const firstCalls = useFirstCalls(human ? curatorId : null, from, to);
	const start = useStartFreeCheckpoint();

	const project = projects.data?.find((row) => row.id === projectId);
	const failures: Record<string, string> = {
		notEligible: t(
			"admin.checkpoints.free.notEligible",
			"This project cannot take a checkpoint now.",
		),
		slotTaken: t(
			"admin.checkpoints.free.slotTaken",
			"That curator is no longer free at this first call. Pick another.",
		),
		curatorMissing: t(
			"admin.checkpoints.free.curatorMissing",
			"Pick the person who curates it.",
		),
		firstCallMissing: t(
			"admin.checkpoints.free.firstCallMissing",
			"Pick the first call.",
		),
	};

	const submit = (values: {
		projectId: string;
		userId?: string;
		firstCall?: string;
		reason: string;
	}) =>
		start.mutate(
			{ kind, ...values },
			{
				onSuccess: () => {
					message.success(
						t(
							"admin.checkpoints.free.started",
							"The free checkpoint has started",
						),
					);
					onClose();
				},
				onError: (error) =>
					message.error(
						(axios.isAxiosError(error) &&
							failures[error.response?.data?.error as string]) ||
							t(
								"admin.checkpoints.free.failed",
								"The checkpoint did not start",
							),
					),
			},
		);

	return (
		<Modal
			open
			width={560}
			title={t("admin.checkpoints.free.title", "Add a free checkpoint")}
			okText={t("admin.checkpoints.free.submit", "Start for free")}
			cancelText={t("common.cancel", "Cancel")}
			confirmLoading={start.isPending}
			onOk={() => form.submit()}
			onCancel={onClose}
			destroyOnHidden
		>
			<Form form={form} layout="vertical" variant="filled" onFinish={submit}>
				<Form.Item
					name="projectId"
					label={t("admin.checkpoints.free.project", "Project")}
					extra={t(
						"admin.checkpoints.free.projectHelp",
						"Active projects past Introduction, with no checkpoint under way.",
					)}
					rules={[{ required: true }]}
				>
					<Select
						showSearch
						filterOption={false}
						onSearch={setQuery}
						loading={projects.isFetching}
						placeholder={t(
							"admin.checkpoints.free.searchProject",
							"Search a project",
						)}
						options={(projects.data ?? []).map((row) => ({
							value: row.id,
							label: [row.name, row.stage, row.author]
								.filter(Boolean)
								.join(" · "),
						}))}
					/>
				</Form.Item>

				{project && (
					<Flex vertical gap={4} style={{ marginBottom: 16 }}>
						<Typography.Text strong>
							{t("admin.checkpoints.free.goal", "Goal")}
						</Typography.Text>
						<Typography.Text>{project.goal}</Typography.Text>
						<Typography.Text type="secondary">
							{t(
								"admin.checkpoints.free.goalHelp",
								"The author rewrites it on day 1, after the curator's first letter, and sends the tasks for the check.",
							)}
						</Typography.Text>
					</Flex>
				)}

				<Form.Item label={t("admin.checkpoints.free.kind", "Curator kind")}>
					<Segmented<CheckpointCuratorKind>
						value={kind}
						onChange={setKind}
						options={[
							{
								value: CheckpointCuratorKind.AI,
								label: t("admin.checkpoints.list.aiCurator", "AI curator"),
							},
							{
								value: CheckpointCuratorKind.Human,
								label: t("admin.checkpoints.list.filter.human", "A person"),
							},
						]}
					/>
				</Form.Item>

				{human && (
					<>
						<Form.Item
							name="userId"
							label={t("admin.checkpoints.assign.person", "Person")}
							rules={[{ required: true }]}
						>
							<Select
								{...userSearch}
								placeholder={t(
									"admin.checkpoints.assign.search",
									"Search any user by name or email",
								)}
							/>
						</Form.Item>
						<Form.Item
							name="firstCall"
							label={t("admin.checkpoints.free.firstCall", "First call")}
							extra={t(
								"admin.checkpoints.free.firstCallHelp",
								"From the curator's free hours; the five calls are booked from it.",
							)}
							rules={[{ required: true }]}
						>
							<Select
								disabled={!curatorId}
								loading={firstCalls.isFetching}
								notFoundContent={t(
									"admin.checkpoints.free.noSlots",
									"No free hours in the next two weeks",
								)}
								options={(firstCalls.data?.starts ?? []).map((at) => ({
									value: at,
									// In the curator's own hours, as they set them.
									label: firstCalls.data?.timeZone
										? `${dayjs(at).tz(firstCalls.data.timeZone).format("ddd D MMM, HH:mm")} (${firstCalls.data.timeZone})`
										: dayjs(at).format("ddd D MMM, HH:mm"),
								}))}
							/>
						</Form.Item>
					</>
				)}

				<Alert
					type="warning"
					showIcon
					icon={<IconInfoCircle size={16} />}
					title={t(
						"admin.checkpoints.assign.free.title",
						"No payment is taken",
					)}
					description={t(
						"admin.checkpoints.assign.free.body",
						"The checkpoint starts as a paid one would: a person is asked and the calls are booked; the AI starts today.",
					)}
				/>

				<Form.Item
					name="reason"
					label={t("admin.checkpoints.assign.reason", "Reason")}
					extra={t(
						"admin.checkpoints.assign.reasonHelp",
						"Required for the audit log.",
					)}
					rules={[{ required: true, min: 3 }]}
					style={{ marginTop: 16 }}
				>
					<Input
						placeholder={t(
							"admin.checkpoints.assign.reasonDraft",
							"Partner studio — checkpoint given for free",
						)}
					/>
				</Form.Item>
			</Form>
		</Modal>
	);
}
