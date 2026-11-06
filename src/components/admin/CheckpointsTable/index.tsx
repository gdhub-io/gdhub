"use client";

import { IconAlertCircle, IconRefresh } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	AutoComplete,
	Button,
	Flex,
	Input,
	Segmented,
	Select,
	Table,
	Typography,
} from "antd";
import debounce from "lodash/debounce";
import { useMemo, useState } from "react";
import { AdminVerdictModal } from "@/components/admin/AdminVerdictModal";
import { AssignCuratorModal } from "@/components/admin/AssignCuratorModal";
import { CheckpointKpis } from "@/components/admin/CheckpointKpis";
import { CuratorJournalDrawer } from "@/components/admin/CuratorJournalDrawer";
import { RefundCheckpointModal } from "@/components/admin/RefundCheckpointModal";
import {
	EmptyState,
	skeletonColumns,
	skeletonRows,
	tableStyles as styles,
	tableScrollX,
} from "@/components/ui";
import { CheckpointCuratorKind, CheckpointStatus } from "@/config/prisma-enums";
import {
	type AdminCheckpointsFilter,
	useAdminCheckpoints,
	useCheckpointProjectOptions,
} from "@/hooks/admin-checkpoints";
import type { AdminCheckpointRowDto as Row } from "@/types/checkpoints";
import own from "./style.module.scss";
import { useCheckpointColumns } from "./useCheckpointColumns";

const LISTED = [
	CheckpointStatus.AwaitingCurator,
	CheckpointStatus.Active,
	CheckpointStatus.Review,
	CheckpointStatus.Closed,
	CheckpointStatus.Cancelled,
	CheckpointStatus.Draft,
] as const;

/** The project's least width before the table scrolls; it takes what is left above that. */
const PROJECT_WIDTH = 160;

/** Frames 11.5–11.5d: every paid checkpoint, and the way into its refund. */
export function CheckpointsTable({
	canManage,
	canDelete,
}: {
	canManage: boolean;
	canDelete: boolean;
}) {
	const { t } = useTranslate();
	const [filter, setFilter] = useState<AdminCheckpointsFilter>({ page: 1 });
	const [refunding, setRefunding] = useState<Row | null>(null);
	const [deciding, setDeciding] = useState<Row | null>(null);
	const [assigning, setAssigning] = useState<Row | null>(null);
	const [reading, setReading] = useState<Row | null>(null);
	const list = useAdminCheckpoints(filter);
	const [typed, setTyped] = useState("");
	const projectOptions = useCheckpointProjectOptions(typed);
	const suggest = useMemo(
		() => debounce((value: string) => setTyped(value.trim()), 300),
		[],
	);

	const { columns, statusLabels } = useCheckpointColumns({
		canManage,
		canDelete,
		setRefunding,
		setDeciding,
		setAssigning,
		setReading,
	});

	const loading = list.isPending;
	const failed = list.isError && !list.data;

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
			<CheckpointKpis totals={list.data?.totals} />
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
				<AutoComplete
					className={own.search}
					options={projectOptions.data?.map((name) => ({ value: name }))}
					onSearch={suggest}
					onSelect={(name: string) =>
						setFilter((current) => ({ ...current, q: name, page: 1 }))
					}
				>
					<Input.Search
						allowClear
						placeholder={t(
							"admin.checkpoints.list.search",
							"Search by project",
						)}
						onSearch={(value) =>
							setFilter((current) => ({
								...current,
								q: value.trim() || undefined,
								page: 1,
							}))
						}
					/>
				</AutoComplete>
			</Flex>

			<Table<Row>
				className={styles.table}
				rowKey="id"
				columns={loading ? skeletonColumns(columns) : columns}
				dataSource={
					loading ? skeletonRows<Row>(5, "id") : failed ? [] : list.data?.items
				}
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
				scroll={{ x: tableScrollX(columns, PROJECT_WIDTH) }}
				locale={{ emptyText }}
			/>

			{/* Keyed so each checkpoint opens on a fresh reason and mutation. */}
			{deciding && (
				<AdminVerdictModal
					checkpointId={deciding.id}
					onClose={() => setDeciding(null)}
				/>
			)}
			{assigning && (
				<AssignCuratorModal
					checkpoint={assigning}
					onClose={() => setAssigning(null)}
				/>
			)}
			{reading && (
				<CuratorJournalDrawer
					checkpoint={reading}
					onClose={() => setReading(null)}
				/>
			)}
			<RefundCheckpointModal
				key={refunding?.id}
				checkpoint={refunding}
				onClose={() => setRefunding(null)}
			/>
		</Flex>
	);
}
