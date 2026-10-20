"use client";

import {
	IconAlertCircle,
	IconDotsVertical,
	IconReceiptRefund,
	IconRefresh,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Dropdown,
	Flex,
	Input,
	Segmented,
	Select,
	Skeleton,
	Table,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useState } from "react";
import styles from "@/components/admin/PromoCodesTable/style.module.scss";
import { RefundCheckpointModal } from "@/components/admin/RefundCheckpointModal";
import { EmptyState, StatusDot, type StatusTone } from "@/components/ui";
import { formatCheckpointMoney } from "@/config/checkpoint-pricing";
import { CheckpointCuratorKind, CheckpointStatus } from "@/config/prisma-enums";
import {
	type AdminCheckpointsFilter,
	useAdminCheckpoints,
	useRefundReasonLabels,
} from "@/hooks/admin-checkpoints";
import type { AdminCheckpointRowDto as Row } from "@/types/checkpoints";
import own from "./style.module.scss";

const LISTED = [
	CheckpointStatus.AwaitingCurator,
	CheckpointStatus.Active,
	CheckpointStatus.Review,
	CheckpointStatus.Closed,
	CheckpointStatus.Cancelled,
] as const;

const TONE: Partial<Record<CheckpointStatus, StatusTone>> = {
	AwaitingCurator: "warning",
	Active: "success",
	Review: "info",
	Closed: "neutral",
	Cancelled: "neutral",
};

const SKELETON_ROWS = Array.from({ length: 5 }, (_, index) => ({
	id: `skeleton-${index}`,
})) as Row[];

/** Frames 11.5–11.5d: every paid checkpoint, and the way into its refund. */
export function CheckpointsTable({ canManage }: { canManage: boolean }) {
	const { t } = useTranslate();
	const [filter, setFilter] = useState<AdminCheckpointsFilter>({ page: 1 });
	const [refunding, setRefunding] = useState<Row | null>(null);
	const list = useAdminCheckpoints(filter);

	const reasonLabels = useRefundReasonLabels();
	const statusLabels: Partial<Record<CheckpointStatus, string>> = {
		AwaitingCurator: t(
			"admin.checkpoints.list.status.awaitingCurator",
			"Awaiting curator",
		),
		Active: t("admin.checkpoints.list.status.active", "Active"),
		Review: t("admin.checkpoints.list.status.review", "Review"),
		Closed: t("admin.checkpoints.list.status.closed", "Closed"),
		Cancelled: t("admin.checkpoints.list.status.cancelled", "Cancelled"),
	};

	const loading = list.isPending;
	const failed = list.isError && !list.data;
	const skeleton = <Skeleton.Input active size="small" />;

	const columns: ColumnsType<Row> = [
		{
			title: t("admin.checkpoints.list.column.project", "Project"),
			key: "project",
			render: (_, row) => (
				<Flex vertical>
					<Typography.Text strong>{row.projectName}</Typography.Text>
					<Typography.Text type="secondary" className={own.sub}>
						{t(
							"admin.checkpoints.list.checkpoint",
							"Checkpoint {number} · {stage}",
							{ number: row.number, stage: row.stageName },
						)}
					</Typography.Text>
				</Flex>
			),
		},
		{
			title: t("admin.checkpoints.list.column.curator", "Curator"),
			key: "curator",
			width: 180,
			render: (_, row) =>
				row.curatorName ?? t("admin.checkpoints.list.aiCurator", "AI curator"),
		},
		{
			title: t("admin.checkpoints.list.column.dates", "Dates"),
			key: "dates",
			width: 180,
			render: (_, row) =>
				row.startedAt && row.dueAt ? (
					<span className={own.dates}>
						{t("checkpoints.paid.dates", "{from} – {to}", {
							from: dayjs.utc(row.startedAt).format("D MMM"),
							to: dayjs.utc(row.dueAt).format("D MMM YYYY"),
						})}
					</span>
				) : (
					<span className={styles.none}>—</span>
				),
		},
		{
			title: t("admin.checkpoints.list.column.status", "Status"),
			key: "status",
			width: 160,
			render: (_, row) => (
				<StatusDot
					tone={TONE[row.status] ?? "neutral"}
					label={statusLabels[row.status] ?? row.status}
				/>
			),
		},
		{
			title: t("admin.checkpoints.list.column.paid", "Paid"),
			key: "paid",
			width: 200,
			align: "right",
			render: (_, row) =>
				row.paid === null ? (
					<span className={styles.none}>—</span>
				) : (
					<span className={styles.number}>
						{formatCheckpointMoney(row.paid)}
					</span>
				),
		},
		{
			title: t("admin.checkpoints.list.column.refunded", "Refunded"),
			key: "refunded",
			width: 200,
			align: "right",
			render: (_, row) =>
				row.refunded ? (
					<span className={styles.number}>
						{formatCheckpointMoney(row.refunded)}
						{row.refundReason && (
							<Typography.Text type="secondary" className={own.sub}>
								{` · ${reasonLabels[row.refundReason]}`}
							</Typography.Text>
						)}
					</span>
				) : (
					<span className={styles.none}>—</span>
				),
		},
		{
			key: "action",
			width: 56,
			align: "right",
			render: (_, row) =>
				canManage &&
				row.canRefund && (
					<Dropdown
						trigger={["click"]}
						placement="bottomRight"
						menu={{
							items: [
								{
									key: "refund",
									icon: <IconReceiptRefund size={14} />,
									label: t(
										"admin.checkpoints.list.refundPayment",
										"Refund payment",
									),
									onClick: () => setRefunding(row),
								},
							],
						}}
					>
						<Button
							type="text"
							size="small"
							icon={<IconDotsVertical size={16} />}
							aria-label={t("admin.checkpoints.list.actions", "Actions")}
						/>
					</Dropdown>
				),
		},
	];

	const filtered =
		!!filter.status || !!filter.stage || !!filter.curatorKind || !!filter.q;
	const emptyText = failed ? (
		<EmptyState
			size="compact"
			icon={IconAlertCircle}
			tint="var(--gd-danger-tint)"
			ink="var(--gd-danger-on-tint)"
			title={t(
				"admin.checkpoints.list.error.title",
				"Couldn't load checkpoints",
			)}
			description={t(
				"admin.checkpoints.list.error.description",
				"The server did not answer. Try again in a moment.",
			)}
			action={
				<Button icon={<IconRefresh size={16} />} onClick={() => list.refetch()}>
					{t("admin.checkpoints.list.error.retry", "Try again")}
				</Button>
			}
		/>
	) : (
		<Typography.Text type="secondary">
			{filtered
				? t("admin.checkpoints.list.emptyFiltered", "No checkpoints match")
				: t("admin.checkpoints.list.empty", "No paid checkpoints yet")}
		</Typography.Text>
	);

	return (
		<Flex vertical gap={16}>
			<Flex justify="space-between" gap={16} wrap>
				<Segmented<"all" | CheckpointStatus>
					value={filter.status ?? "all"}
					onChange={(value) =>
						setFilter((current) => ({
							...current,
							status: value === "all" ? undefined : value,
							page: 1,
						}))
					}
					options={[
						{
							value: "all",
							label: t("admin.checkpoints.list.filter.all", "All"),
						},
						...LISTED.map((status) => ({
							value: status,
							label: statusLabels[status],
						})),
					]}
				/>
				<Flex gap={8} wrap>
					<Select
						allowClear
						className={own.filter}
						placeholder={t("admin.checkpoints.list.filter.stage", "All stages")}
						value={filter.stage}
						options={list.data?.stages.map((stage) => ({
							value: stage,
							label: stage,
						}))}
						onChange={(stage) =>
							setFilter((current) => ({ ...current, stage, page: 1 }))
						}
					/>
					<Select
						allowClear
						className={own.filter}
						placeholder={t(
							"admin.checkpoints.list.filter.curator",
							"All curators",
						)}
						value={filter.curatorKind}
						options={[
							{
								value: CheckpointCuratorKind.Human,
								label: t("admin.checkpoints.list.filter.human", "A person"),
							},
							{
								value: CheckpointCuratorKind.AI,
								label: t("admin.checkpoints.list.aiCurator", "AI curator"),
							},
						]}
						onChange={(curatorKind) =>
							setFilter((current) => ({ ...current, curatorKind, page: 1 }))
						}
					/>
				</Flex>
				<Input.Search
					allowClear
					className={own.search}
					placeholder={t("admin.checkpoints.list.search", "Search by project")}
					onSearch={(value) =>
						setFilter((current) => ({
							...current,
							q: value.trim() || undefined,
							page: 1,
						}))
					}
				/>
			</Flex>

			<Table<Row>
				className={styles.table}
				rowKey="id"
				columns={
					loading
						? columns.map((column) => ({
								...column,
								render: () => (column.key === "action" ? null : skeleton),
							}))
						: columns
				}
				dataSource={loading ? SKELETON_ROWS : failed ? [] : list.data?.items}
				pagination={
					list.data && list.data.total > list.data.pageSize
						? {
								current: filter.page,
								pageSize: list.data.pageSize,
								total: list.data.total,
								showSizeChanger: false,
								showTotal: (count) =>
									t(
										"admin.checkpoints.list.total",
										"{count} paid checkpoints",
										{
											count,
										},
									),
								onChange: (page) =>
									setFilter((current) => ({ ...current, page })),
							}
						: false
				}
				scroll={{ x: 1440 }}
				locale={{ emptyText }}
			/>

			{/* Keyed so each checkpoint opens on a fresh reason and mutation. */}
			<RefundCheckpointModal
				key={refunding?.id}
				checkpoint={refunding}
				onClose={() => setRefunding(null)}
			/>
		</Flex>
	);
}
