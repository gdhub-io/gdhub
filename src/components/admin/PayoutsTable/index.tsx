"use client";

import {
	IconAlertCircle,
	IconChevronDown,
	IconChevronRight,
	IconCircleCheck,
	IconDotsVertical,
	IconLock,
	IconNote,
	IconRefresh,
	IconUsers,
	IconWallet,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Dropdown,
	Flex,
	type MenuProps,
	Skeleton,
	Table,
	Tooltip,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import shared from "@/components/admin/PromoCodesTable/style.module.scss";
import {
	EmptyState,
	KpiCard,
	StatusDot,
	type StatusTone,
} from "@/components/ui";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { CHECKPOINT_PARTS, PLATFORM_SHARE } from "@/config/checkpoint";
import { formatCheckpointMoney } from "@/config/checkpoint-pricing";
import { CheckpointFeeReason } from "@/config/prisma-enums";
import type {
	AdminPayoutsDto,
	PayoutCheckpointDto,
	PayoutStatus,
	AdminPayoutRowDto as Row,
} from "@/types/checkpoints";
import { formatPayoutMoney, useInvoicingLabels } from "./format";
import styles from "./style.module.scss";

const STATUS_TONE: Record<PayoutStatus, StatusTone> = {
	due: "warning",
	late: "danger",
	notDue: "neutral",
	paid: "success",
};

const SKELETON_ROWS = Array.from({ length: 4 }, (_, index) => ({
	curatorId: `skeleton-${index}`,
})) as Row[];

const SHARE = Math.round((1 - PLATFORM_SHARE) * 100);

export type PayoutsTableProps = {
	data: AdminPayoutsDto | undefined;
	status: "pending" | "error" | "success";
	onRetry: () => void;
	/** Without it the page is read-only: no row menu. */
	canManage: boolean;
	onMarkPaid: (row: Row) => void;
	onEditNote: (row: Row) => void;
	/** Rows open on first render, for the stories. */
	defaultExpanded?: string[];
};

/** Frames 13.2–13.2e: the month's KPI cards and one row per curator, each expanding to its fees. */
export function PayoutsTable({
	data,
	status,
	onRetry,
	canManage,
	onMarkPaid,
	onEditNote,
	defaultExpanded,
}: PayoutsTableProps) {
	const { t } = useTranslate();
	const invoicing = useInvoicingLabels();

	const loading = status === "pending";
	const failed = status === "error";
	const skeleton = <Skeleton.Input active size="small" />;
	const dueOn = data ? dayjs.utc(data.dueOn).format("D MMM") : "";
	const monthName = data ? dayjs.utc(data.month).format("MMMM YYYY") : "";

	const statusLabel = (row: Row) => {
		switch (row.status) {
			case "due":
				return t("admin.payouts.status.due", "Due by {date}", { date: dueOn });
			case "late":
				return t("admin.payouts.status.late", "Late · due {date}", {
					date: dueOn,
				});
			case "notDue":
				return t("admin.payouts.status.notDue", "Not due yet");
			case "paid":
				return t("admin.payouts.status.paid", "Paid {date} · ref {reference}", {
					date: row.payout ? dayjs.utc(row.payout.paidOn).format("D MMM") : "—",
					reference: row.payout?.reference ?? "—",
				});
		}
	};

	// All time, not the month on screen; the server sends no average below five.
	const ratingLabel = ({ rating }: Row) => {
		if (!rating.count) return null;
		return rating.average === null
			? t(
					"admin.payouts.ratingCount",
					"{count, plural, one {# rating} other {# ratings}}",
					{ count: rating.count },
				)
			: t("admin.payouts.ratingAverage", "★ {average} · {count} ratings", {
					average: rating.average.toFixed(1),
					count: rating.count,
				});
	};

	const menuItems = (row: Row): MenuProps["items"] => {
		if (row.status === "paid") {
			return [
				{
					key: "note",
					icon: <IconNote size={14} />,
					label: row.payout?.note
						? t("admin.payouts.menu.editNote", "Edit note")
						: t("admin.payouts.menu.addNote", "Add a note"),
					onClick: () => onEditNote(row),
				},
			];
		}
		const label = t("admin.payouts.menu.markPaid", "Mark paid");

		return [
			row.details
				? {
						key: "markPaid",
						icon: <IconCircleCheck size={14} />,
						label,
						onClick: () => onMarkPaid(row),
					}
				: {
						key: "markPaid",
						icon: <IconLock size={14} />,
						disabled: true,
						label: (
							<Tooltip
								placement="left"
								title={t(
									"admin.payouts.menu.noDetails",
									"No payout details. {name} has to add them in Advisor settings → Paid work.",
									{ name: row.name ?? "" },
								)}
							>
								<span>{label}</span>
							</Tooltip>
						),
					},
		];
	};

	const columns: ColumnsType<Row> = [
		{
			title: t("admin.payouts.column.curator", "Curator"),
			key: "curator",
			render: (_, row) => (
				<Flex gap={12} align="center" className={styles.person}>
					<AppAvatar size={32} src={row.image ?? undefined}>
						{row.name?.[0]}
					</AppAvatar>
					<Flex vertical className={styles.stack}>
						<Typography.Text className={styles.name} ellipsis>
							{row.name ?? "—"}
						</Typography.Text>
						{(row.level || row.rating.count > 0) && (
							<Typography.Text type="secondary" className={styles.sub}>
								{[row.level && t(row.level, row.level), ratingLabel(row)]
									.filter(Boolean)
									.join(" · ")}
							</Typography.Text>
						)}
					</Flex>
				</Flex>
			),
		},
		{
			title: t("admin.payouts.column.details", "Payout details"),
			key: "details",
			width: 320,
			render: (_, row) =>
				row.details ? (
					<Flex vertical className={styles.stack}>
						<Typography.Text ellipsis>{row.details.holder}</Typography.Text>
						<Typography.Text type="secondary" className={styles.sub}>
							{row.details.account} · {invoicing[row.details.invoicing]}
						</Typography.Text>
					</Flex>
				) : (
					<Flex vertical gap={2}>
						<StatusDot
							tone="warning"
							label={t("admin.payouts.noDetails", "No payout details")}
						/>
						<Typography.Text type="secondary" className={styles.sub}>
							{t(
								"admin.payouts.noDetailsNote",
								"The curator has not added them",
							)}
						</Typography.Text>
					</Flex>
				),
		},
		{
			title: t("admin.payouts.column.checkpoints", "Checkpoints"),
			key: "checkpoints",
			width: 120,
			align: "center",
			render: (_, row) => (
				<span className={shared.number}>{row.checkpoints.length}</span>
			),
		},
		{
			title: t("admin.payouts.column.amount", "Amount"),
			key: "amount",
			width: 160,
			align: "right",
			render: (_, row) => (
				<span className={shared.number}>{formatPayoutMoney(row.amount)}</span>
			),
		},
		{
			title: t("admin.payouts.column.status", "Status"),
			key: "status",
			width: 320,
			render: (_, row) => (
				<Flex vertical gap={2} className={styles.stack}>
					<StatusDot tone={STATUS_TONE[row.status]} label={statusLabel(row)} />
					{row.payout?.note && (
						<Flex gap={4} align="center" className={styles.note}>
							<IconNote size={14} className={styles.noteIcon} />
							<Typography.Text
								type="secondary"
								className={styles.noteText}
								ellipsis={{ tooltip: row.payout.note }}
							>
								{row.payout.note}
							</Typography.Text>
						</Flex>
					)}
				</Flex>
			),
		},
		{
			key: "action",
			width: 56,
			align: "right",
			render: (_, row) =>
				// The current month is still being earned: nothing to act on yet.
				canManage &&
				row.status !== "notDue" && (
					<Dropdown
						trigger={["click"]}
						placement="bottomRight"
						menu={{ items: menuItems(row) }}
					>
						<Button
							type="text"
							size="small"
							icon={<IconDotsVertical size={16} />}
							aria-label={t("admin.payouts.actions", "Actions")}
						/>
					</Dropdown>
				),
		},
	];

	const reasonLine = (fee: PayoutCheckpointDto) => {
		switch (fee.reason) {
			case CheckpointFeeReason.Full:
				return {
					reason: t("checkpoints.fee.reason.full", "Full fee"),
					formula: t("checkpoints.fee.formula.full", "{share}% of {paid}", {
						share: SHARE,
						paid: formatCheckpointMoney(fee.paid),
					}),
				};
			case CheckpointFeeReason.RefundReduced:
				return {
					reason: t(
						"checkpoints.fee.reason.refundReduced",
						"Reduced by a refund",
					),
					formula: t(
						"checkpoints.fee.formula.refundReduced",
						"{share}% of ({paid} − {refunded})",
						{
							share: SHARE,
							paid: formatCheckpointMoney(fee.paid),
							refunded: formatCheckpointMoney(fee.refunded),
						},
					),
				};
			case CheckpointFeeReason.Replacement:
				return {
					reason: t(
						"checkpoints.fee.reason.replacement",
						"Took over · {parts} of {total} parts",
						{ parts: fee.parts, total: CHECKPOINT_PARTS.Human },
					),
					// Every part but the verdict is a call held.
					formula: t(
						"checkpoints.fee.formula.replacement",
						"{calls, plural, one {# call} other {# calls}} and the verdict",
						{ calls: Math.max(fee.parts - 1, 0) },
					),
				};
		}
	};

	const feeColumns: ColumnsType<PayoutCheckpointDto> = [
		{
			title: t("admin.payouts.expanded.checkpoint", "Checkpoint"),
			key: "checkpoint",
			render: (_, fee) => (
				<Flex vertical className={styles.stack}>
					<Typography.Text className={styles.name} ellipsis>
						{fee.projectName ?? "—"}
					</Typography.Text>
					<Typography.Text type="secondary" className={styles.sub} ellipsis>
						{fee.stageName
							? t(
									"admin.checkpoints.list.checkpoint",
									"Checkpoint {number} · {stage}",
									{ number: fee.number, stage: fee.stageName },
								)
							: t("admin.payouts.expanded.number", "Checkpoint {number}", {
									number: fee.number,
								})}
					</Typography.Text>
				</Flex>
			),
		},
		{
			title: t("admin.payouts.expanded.closed", "Closed"),
			key: "closed",
			width: 120,
			render: (_, fee) => dayjs.utc(fee.closedAt).format("D MMM"),
		},
		{
			title: t("admin.payouts.expanded.paid", "Paid"),
			key: "paid",
			width: 112,
			align: "right",
			render: (_, fee) => (
				<span className={shared.number}>{formatCheckpointMoney(fee.paid)}</span>
			),
		},
		{
			title: t("admin.payouts.expanded.refunded", "Refunded"),
			key: "refunded",
			width: 112,
			align: "right",
			render: (_, fee) =>
				fee.refunded > 0 ? (
					<span className={shared.number}>
						{formatCheckpointMoney(fee.refunded)}
					</span>
				) : (
					<span className={shared.none}>—</span>
				),
		},
		{
			title: t("admin.payouts.expanded.why", "Why this fee"),
			key: "why",
			width: 280,
			render: (_, fee) => {
				const { reason, formula } = reasonLine(fee);
				return (
					<Flex vertical className={styles.stack}>
						<Typography.Text ellipsis>{reason}</Typography.Text>
						<Typography.Text type="secondary" className={styles.sub} ellipsis>
							{formula}
						</Typography.Text>
					</Flex>
				);
			},
		},
		{
			title: t("admin.payouts.expanded.fee", "Fee"),
			key: "fee",
			width: 120,
			align: "right",
			render: (_, fee) => (
				<span className={styles.fee}>{formatPayoutMoney(fee.fee)}</span>
			),
		},
	];

	const emptyText = failed ? (
		<EmptyState
			size="compact"
			icon={IconAlertCircle}
			tint="var(--gd-danger-tint)"
			ink="var(--gd-danger-on-tint)"
			title={t("admin.payouts.error.title", "Couldn't load payouts")}
			description={t(
				"admin.payouts.error.description",
				"The server did not answer. Try again in a moment.",
			)}
			action={
				<Button icon={<IconRefresh size={16} />} onClick={onRetry}>
					{t("admin.payouts.error.retry", "Try again")}
				</Button>
			}
		/>
	) : (
		<Typography.Text type="secondary">
			{t("admin.payouts.empty", "Nobody earned a fee in {month}", {
				month: monthName,
			})}
		</Typography.Text>
	);

	return (
		<Flex vertical gap={16}>
			<PayoutKpis totals={failed ? undefined : data?.totals} dueOn={dueOn} />

			<Table<Row>
				className={`${shared.table} ${styles.payouts}`}
				rowKey="curatorId"
				columns={
					loading
						? columns.map((column) => ({
								...column,
								render: () => (column.key === "action" ? null : skeleton),
							}))
						: columns
				}
				dataSource={loading ? SKELETON_ROWS : failed ? [] : data?.rows}
				pagination={false}
				// The fixed columns and room for a curator's name; the card is narrower than 1260 on a laptop.
				scroll={{ x: 1184 }}
				locale={{ emptyText }}
				expandable={{
					columnWidth: 48,
					defaultExpandedRowKeys: defaultExpanded,
					rowExpandable: (row) => !loading && row.checkpoints?.length > 0,
					expandIcon: ({ expanded, onExpand, record, expandable }) =>
						expandable && (
							<Button
								type="text"
								size="small"
								icon={
									expanded ? (
										<IconChevronDown size={16} />
									) : (
										<IconChevronRight size={16} />
									)
								}
								aria-expanded={expanded}
								aria-label={t("admin.payouts.expand", "Show checkpoints")}
								onClick={(event) => onExpand(record, event)}
							/>
						),
					expandedRowRender: (row) => (
						<Table<PayoutCheckpointDto>
							className={styles.feeTable}
							rowKey="feeId"
							columns={feeColumns}
							dataSource={row.checkpoints}
							pagination={false}
						/>
					),
				}}
			/>
		</Flex>
	);
}

function PayoutKpis({
	totals,
	dueOn,
}: {
	totals: AdminPayoutsDto["totals"] | undefined;
	dueOn: string;
}) {
	const { t } = useTranslate();
	const curators = totals ? totals.curatorsPaid + totals.curatorsDue : 0;

	return (
		<div className={styles.kpis}>
			<KpiCard
				icon={IconWallet}
				name={t("admin.payouts.kpi.toPay", "To pay")}
				value={totals ? formatPayoutMoney(totals.toPay) : "—"}
				note={
					totals &&
					t("admin.payouts.kpi.dueBy", "Due by {date}", { date: dueOn })
				}
			/>
			<KpiCard
				icon={IconCircleCheck}
				name={t("admin.payouts.kpi.paid", "Paid")}
				value={totals ? formatPayoutMoney(totals.paid) : "—"}
				note={
					totals &&
					t(
						"admin.payouts.kpi.transfers",
						"{count, plural, one {# transfer} other {# transfers}}",
						{ count: totals.curatorsPaid },
					)
				}
			/>
			<KpiCard
				icon={IconUsers}
				name={t("admin.payouts.kpi.curators", "Curators")}
			>
				<Tooltip
					title={
						totals &&
						t("admin.payouts.kpi.curatorsTooltip", "{paid} paid · {due} due", {
							paid: totals.curatorsPaid,
							due: totals.curatorsDue,
						})
					}
				>
					<div className={styles.mix}>
						<div className={styles.split}>
							{totals && curators > 0 && (
								<>
									<span
										className={styles.paid}
										style={{ flexGrow: totals.curatorsPaid }}
									/>
									<span
										className={styles.due}
										style={{ flexGrow: totals.curatorsDue }}
									/>
								</>
							)}
						</div>
						<div className={styles.legend}>
							<span className={styles.key}>
								<i className={styles.paid} />
								{t("admin.payouts.kpi.legend.paid", "Paid")}
								<b>{totals ? totals.curatorsPaid : "—"}</b>
							</span>
							<span className={styles.key}>
								<i className={styles.due} />
								{t("admin.payouts.kpi.legend.due", "Due")}
								<b>{totals ? totals.curatorsDue : "—"}</b>
							</span>
						</div>
					</div>
				</Tooltip>
			</KpiCard>
		</div>
	);
}
