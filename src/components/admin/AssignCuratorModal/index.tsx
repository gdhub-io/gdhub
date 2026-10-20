"use client";

import { IconInfoCircle } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
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
import debounce from "lodash/debounce";
import { useMemo, useState } from "react";
import { CheckpointCuratorKind, CheckpointStatus } from "@/config/prisma-enums";
import { useAssignCurator } from "@/hooks/admin-checkpoints";
import type { AdminCheckpointRowDto } from "@/types/checkpoints";

type UserOption = { id: string; name?: string | null; email?: string | null };

/**
 * Frames `z20Q3F` (a running checkpoint: replace its curator) and 11.9 (a
 * draft: give it for free). No payment is taken either way; the reason goes to
 * the audit log.
 */
export function AssignCuratorModal({
	checkpoint,
	onClose,
}: {
	checkpoint: AdminCheckpointRowDto;
	onClose: () => void;
}) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const [form] = Form.useForm();
	const draft = checkpoint.status === CheckpointStatus.Draft;
	// A draft starts on the kind its author picked; a swap is always a person.
	const [kind, setKind] = useState<CheckpointCuratorKind>(
		draft && !checkpoint.curatorName
			? CheckpointCuratorKind.AI
			: CheckpointCuratorKind.Human,
	);
	const [search, setSearch] = useState("");
	const assign = useAssignCurator(checkpoint.id);

	const { data: users = [], isFetching } = useQuery({
		queryKey: ["user-search", search],
		queryFn: () =>
			axios
				.get<UserOption[]>("/api/users/search", {
					params: { q: search, includeSelf: true },
				})
				.then((res) => res.data),
		enabled: kind === CheckpointCuratorKind.Human,
	});
	const onSearch = useMemo(
		() => debounce((value: string) => setSearch(value), 400),
		[],
	);

	const failures: Record<string, string> = {
		slotTaken: t(
			"admin.checkpoints.assign.slotTaken",
			"That curator is not free at the first call the author chose.",
		),
		firstCallMissing: t(
			"admin.checkpoints.assign.firstCallMissing",
			"The author has not picked a time for the first call yet.",
		),
		draftIncomplete: t(
			"admin.checkpoints.assign.noGoal",
			"The author has not set a goal yet",
		),
	};

	const submit = (values: { userId?: string; reason: string }) =>
		assign.mutate(
			{ kind, ...values },
			{
				onSuccess: () => {
					message.success(
						draft
							? t(
									"admin.checkpoints.assign.given",
									"The checkpoint is given for free",
								)
							: t("admin.checkpoints.assign.done", "The curator is assigned"),
					);
					onClose();
				},
				onError: (error) =>
					message.error(
						(axios.isAxiosError(error) &&
							failures[error.response?.data?.error as string]) ||
							t(
								"admin.checkpoints.assign.failed",
								"The curator was not assigned",
							),
					),
			},
		);

	return (
		<Modal
			open
			width={560}
			title={t("admin.checkpoints.assign.title", "Assign a curator")}
			okText={
				draft
					? t("admin.checkpoints.assign.giveForFree", "Give for free")
					: t("admin.checkpoints.assign.submit", "Assign curator")
			}
			cancelText={t("common.cancel", "Cancel")}
			confirmLoading={assign.isPending}
			onOk={() => form.submit()}
			onCancel={onClose}
			destroyOnHidden
		>
			<Flex vertical gap={16}>
				<Typography.Text type="secondary">
					{`${checkpoint.projectName} · ${t("checkpoints.number", "Checkpoint {number}", { number: checkpoint.number })} · ${checkpoint.stageName}`}
				</Typography.Text>

				{draft && (
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
				)}

				<Form form={form} layout="vertical" variant="filled" onFinish={submit}>
					{kind === CheckpointCuratorKind.Human && (
						<Form.Item
							name="userId"
							label={t("admin.checkpoints.assign.person", "Person")}
							rules={[{ required: true }]}
						>
							<Select
								showSearch
								filterOption={false}
								loading={isFetching}
								onSearch={onSearch}
								placeholder={t(
									"admin.checkpoints.assign.search",
									"Search any user by name or email",
								)}
								options={users.map((user) => ({
									label: user.name || user.email || user.id,
									value: user.id,
								}))}
							/>
						</Form.Item>
					)}

					<Alert
						type="warning"
						showIcon
						icon={<IconInfoCircle size={16} />}
						title={t(
							"admin.checkpoints.assign.free.title",
							"No payment is taken",
						)}
						description={
							draft
								? t(
										"admin.checkpoints.assign.free.body",
										"The checkpoint starts as a paid one would: a person is asked and the calls are booked; the AI starts today.",
									)
								: t(
										"admin.checkpoints.assign.swap.payBody",
										"The new curator is paid for the calls they hold and the verdict; the one who left is paid nothing. The calls keep their times, and the author and the new curator are told.",
									)
						}
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
							placeholder={
								draft
									? t(
											"admin.checkpoints.assign.reasonDraft",
											"Partner studio — checkpoint given for free",
										)
									: t(
											"admin.checkpoints.assign.reasonSwap",
											"Replacing a curator who missed two calls",
										)
							}
						/>
					</Form.Item>
				</Form>
			</Flex>
		</Modal>
	);
}
