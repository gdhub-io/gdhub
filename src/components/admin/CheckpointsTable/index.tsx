"use client";

import {
	IconAlertCircle,
	IconDotsVertical,
	IconMessage,
	IconNotebook,
	IconReceiptRefund,
	IconRefresh,
	IconSignature,
	IconUserPlus,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	AutoComplete,
	Button,
	Divider,
	Dropdown,
	Flex,
	Input,
	Rate,
	Segmented,
	Select,
	Table,
	Tooltip,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import debounce from "lodash/debounce";
import { useMemo, useState } from "react";
import { AdminVerdictModal } from "@/components/admin/AdminVerdictModal";
import { AssignCuratorModal } from "@/components/admin/AssignCuratorModal";
import { CheckpointKpis } from "@/components/admin/CheckpointKpis";
import { CuratorJournalDrawer } from "@/components/admin/CuratorJournalDrawer";
import { RefundCheckpointModal } from "@/components/admin/RefundCheckpointModal";
import {
	EmptyState,
	StatusDot,
	type StatusTone,
	skeletonColumns,
	skeletonRows,
	tableStyles as styles,
	tableScrollX,
} from "@/components/ui";
import {
	formatCheckpointMoney,
	formatMoneyCents,
	moneyOut,
	signedMoney,
} from "@/config/checkpoint-pricing";
import { CheckpointCuratorKind, CheckpointStatus } from "@/config/prisma-enums";
import {
	type AdminCheckpointsFilter,
	useAdminCheckpoints,
	useCheckpointProjectOptions,
	useRefundReasonLabels,
} from "@/hooks/admin-checkpoints";
import { useFeeReasonLabel } from "@/hooks/payouts";
import type {
	CheckpointFeedbackDto,
	AdminCheckpointRowDto as Row,
} from "@/types/checkpoints";
import own from "./style.module.scss";

const LISTED = [
	CheckpointStatus.AwaitingCurator,
	CheckpointStatus.Active,
	CheckpointStatus.Review,
	CheckpointStatus.Closed,
	CheckpointStatus.Cancelled,
	CheckpointStatus.Draft,
] as const;

const TONE: Partial<Record<CheckpointStatus, StatusTone>> = {
	AwaitingCurator: "warning",
	Active: "success",
	Review: "info",
	Closed: "neutral",
	Cancelled: "neutral",
};

/** The project's least width before the table scrolls; it takes what is left above that. */
const PROJECT_WIDTH = 160;

/** A cost that rounds to nothing is left out rather than written as $0. */
const spent = (minor: number) => Math.round(minor) > 0;

function BreakdownLine({
	label,
	value,
	part,
	head,
}: {
	label: string;
	value: string;
	part?: boolean;
	head?: boolean;
}) {
	return (
		<div
			className={[own.line, part && own.part, head && own.head]
				.filter(Boolean)
				.join(" ")}
		>
			<span>{label}</span>
			<span className={own.value}>{value}</span>
		</div>
	);
}

/** 13.6f (`cEF7c`): the author's stars under the status; the comment in its tooltip. */
function RatingLine({
	rating,
	project,
}: {
	rating: CheckpointFeedbackDto;
	project: string;
}) {
	const { t } = useTranslate();

	return (
		<Tooltip
			classNames={{ root: own.ratingTip }}
			title={
				<div className={own.ratingBody}>
					<div className={own.ratingHead}>
						<Rate disabled size="small" value={rating.rating} />
						<span className={own.ratingMeta}>
							{t("admin.checkpoints.list.ratingOf", "{rating} of 5 · {date}", {
								rating: rating.rating,
								date: dayjs(rating.createdAt).format("D MMM"),
							})}
						</span>
					</div>
					{rating.comment && (
						<>
							<span>“{rating.comment}”</span>
							<span className={own.ratingMeta}>
								{t(
									"admin.checkpoints.list.ratingBy",
									"— the author, {project}",
									{
										project,
									},
								)}
							</span>
						</>
					)}
				</div>
			}
		>
			<span className={own.rating}>
				<span className={own.star}>★</span>
				<span className={own.ratingValue}>{rating.rating}</span>
				{rating.comment && <IconMessage size={14} className={own.ratingIcon} />}
			</span>
		</Tooltip>
	);
}

/** Frames 11.5–11.5d: every paid checkpoint, and the way into its refund. */
export function CheckpointsTable({ canManage }: { canManage: boolean }) {
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

	const reasonLabels = useRefundReasonLabels();
	const feeReason = useFeeReasonLabel("admin");
	const statusLabels: Partial<Record<CheckpointStatus, string>> = {
		AwaitingCurator: t(
			"admin.checkpoints.list.status.awaitingCurator",
			"Awaiting curator",
		),
		Active: t("admin.checkpoints.list.status.active", "Active"),
		Review: t("admin.checkpoints.list.status.review", "Review"),
		Closed: t("admin.checkpoints.list.status.closed", "Closed"),
		Cancelled: t("admin.checkpoints.list.status.cancelled", "Cancelled"),
		Draft: t("admin.checkpoints.list.status.draft", "Draft"),
	};

	const breakdown = (row: Row) => {
		const ai = row.curatorName === null;
		return (
			<div className={own.breakdown}>
				<BreakdownLine
					label={t("admin.checkpoints.margin.paid", "Paid")}
					value={row.paid === null ? "—" : formatMoneyCents(row.paid)}
				/>
				<BreakdownLine
					label={t("admin.checkpoints.margin.refunded", "Refunded")}
					value={row.refunded ? moneyOut(row.refunded, formatMoneyCents) : "—"}
				/>
				{!ai &&
					(row.fee ? (
						<BreakdownLine
							label={t(
								"admin.checkpoints.margin.fee",
								"Curator's fee · {reason}",
								{ reason: feeReason(row.fee.reason, row.fee.parts) },
							)}
							value={moneyOut(row.fee.amount, formatMoneyCents)}
						/>
					) : (
						<BreakdownLine
							label={
								row.noFee
									? feeReason(row.noFee)
									: t("admin.checkpoints.margin.feeOnClose", "Fee on close")
							}
							value="—"
						/>
					))}
				<Divider className={own.divider} />
				{spent(row.calls.total) && (
					<>
						<BreakdownLine
							head
							label={t("admin.checkpoints.margin.calls", "Calls")}
							value={moneyOut(row.calls.total, formatMoneyCents)}
						/>
						<BreakdownLine
							part
							label={t(
								"admin.checkpoints.margin.video",
								"Video · {personMinutes} person-min",
								{ personMinutes: Math.round(row.calls.personMinutes) },
							)}
							value={formatMoneyCents(row.calls.video)}
						/>
						<BreakdownLine
							part
							label={t(
								"admin.checkpoints.margin.recording",
								"Recording · {minutes} min",
								{ minutes: Math.round(row.calls.minutes) },
							)}
							value={formatMoneyCents(row.calls.recording)}
						/>
						<BreakdownLine
							part
							label={t(
								"admin.checkpoints.margin.transcript",
								"Transcript · {minutes} min",
								{ minutes: Math.round(row.calls.minutes) },
							)}
							value={formatMoneyCents(row.calls.transcript)}
						/>
					</>
				)}
				{spent(row.aiCost) && (
					<>
						<BreakdownLine
							head
							label={t("admin.checkpoints.margin.ai", "AI")}
							value={moneyOut(row.aiCost, formatMoneyCents)}
						/>
						<BreakdownLine
							part
							label={t(
								"admin.checkpoints.margin.tokens",
								"Tokens · notes, reviews, advice",
							)}
							value={formatMoneyCents(row.aiCost)}
						/>
					</>
				)}
				{(spent(row.calls.total) || spent(row.aiCost)) && (
					<Divider className={own.divider} />
				)}
				<BreakdownLine
					head
					label={t("admin.checkpoints.margin.total", "Margin")}
					value={
						row.margin === null
							? "—"
							: signedMoney(row.margin, formatMoneyCents)
					}
				/>
			</div>
		);
	};

	const loading = list.isPending;
	const failed = list.isError && !list.data;

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
			width: 160,
			render: (_, row) =>
				row.curatorName ?? t("admin.checkpoints.list.aiCurator", "AI curator"),
		},
		{
			title: t("admin.checkpoints.list.column.dates", "Dates"),
			key: "dates",
			width: 176,
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
				<Flex vertical>
					{row.overdue && row.verdictDueBy ? (
						<>
							<StatusDot
								tone="danger"
								label={t("admin.checkpoints.list.status.overdue", "Overdue")}
							/>
							<Typography.Text type="secondary" className={own.sub}>
								{t(
									"admin.checkpoints.list.overdueNote",
									"Verdict due {date} — {days, plural, one {# day} other {# days}} late",
									{
										date: dayjs.utc(row.verdictDueBy).format("D MMM"),
										days: dayjs().diff(dayjs.utc(row.verdictDueBy), "day"),
									},
								)}
							</Typography.Text>
						</>
					) : (
						<StatusDot
							tone={TONE[row.status] ?? "neutral"}
							label={statusLabels[row.status] ?? row.status}
						/>
					)}
					{row.rating && (
						<RatingLine rating={row.rating} project={row.projectName} />
					)}
				</Flex>
			),
		},
		{
			title: t("admin.checkpoints.list.column.paid", "Paid"),
			key: "paid",
			width: 128,
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
			width: 120,
			align: "right",
			render: (_, row) =>
				row.refunded ? (
					<Flex vertical align="flex-end">
						<span className={styles.number}>
							{formatCheckpointMoney(row.refunded)}
						</span>
						{row.refundReason && (
							<Typography.Text type="secondary" className={own.sub}>
								{reasonLabels[row.refundReason]}
							</Typography.Text>
						)}
					</Flex>
				) : (
					<span className={styles.none}>—</span>
				),
		},
		{
			title: t("admin.checkpoints.list.column.margin", "Margin"),
			key: "margin",
			width: 256,
			align: "right",
			render: (_, row) => {
				const parts = [
					row.fee &&
						t("admin.checkpoints.list.margin.fee", "fee −{amount}", {
							amount: formatCheckpointMoney(row.fee.amount),
						}),
					spent(row.calls.total) &&
						t("admin.checkpoints.list.margin.calls", "calls −{amount}", {
							amount: formatMoneyCents(row.calls.total),
						}),
					spent(row.aiCost) &&
						t("admin.checkpoints.list.margin.ai", "AI −{amount}", {
							amount: formatMoneyCents(row.aiCost),
						}),
				].filter(Boolean);

				return (
					<Tooltip
						title={breakdown(row)}
						placement="left"
						classNames={{ root: own.breakdownTip }}
					>
						<Flex vertical align="flex-end" className={own.margin}>
							{row.margin === null ? (
								<span className={styles.none}>—</span>
							) : (
								<span className={styles.number}>{signedMoney(row.margin)}</span>
							)}
							{parts.length > 0 && (
								<Typography.Text type="secondary" className={own.sub}>
									{parts.join(" · ")}
								</Typography.Text>
							)}
						</Flex>
					</Tooltip>
				);
			},
		},
		{
			key: "action",
			width: 56,
			align: "right",
			render: (_, row) => {
				const journal =
					row.curatorKind === CheckpointCuratorKind.AI
						? [
								{
									key: "journal",
									icon: <IconNotebook size={14} />,
									label: t("admin.checkpoints.menu.journal", "Curator journal"),
									onClick: () => setReading(row),
								},
							]
						: [];
				const curating = !canManage
					? []
					: [
							row.overdue && {
								key: "verdict",
								icon: <IconSignature size={14} />,
								label: t(
									"admin.checkpoints.menu.writeVerdict",
									"Write the verdict",
								),
								onClick: () => setDeciding(row),
							},
							row.canAssign && {
								key: "assign",
								icon: <IconUserPlus size={14} />,
								label: t("admin.checkpoints.menu.assign", "Assign a curator"),
								onClick: () => setAssigning(row),
							},
						].filter((item) => !!item);
				const money =
					canManage && row.canRefund
						? [
								{
									key: "refund",
									icon: <IconReceiptRefund size={14} />,
									label: t(
										"admin.checkpoints.list.refundPayment",
										"Refund payment",
									),
									onClick: () => setRefunding(row),
								},
							]
						: [];
				const top = [...curating, ...journal];
				const items = [
					...top,
					...(top.length && money.length ? [{ type: "divider" as const }] : []),
					...money,
				];

				return (
					items.length > 0 && (
						<Dropdown
							trigger={["click"]}
							placement="bottomRight"
							menu={{ items }}
						>
							<Button
								type="text"
								size="small"
								icon={<IconDotsVertical size={16} />}
								aria-label={t("admin.checkpoints.list.actions", "Actions")}
							/>
						</Dropdown>
					)
				);
			},
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
