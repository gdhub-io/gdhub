"use client";

import {
	IconAlertCircle,
	IconAlertTriangle,
	IconCalendarDue,
	IconCircleCheck,
	IconRefresh,
	IconTrendingUp,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Alert, Button, Flex, Skeleton, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import Link from "next/link";
import type { ReactNode } from "react";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
import {
	EmptyState,
	KpiCard,
	SectionHeading,
	StatusDot,
	type StatusTone,
	skeletonColumns,
	skeletonRows,
	tableStyles as table,
	tableScrollX,
} from "@/components/ui";
import { formatMoneyCents } from "@/config/checkpoint-pricing";
import { useFeeReasonLabel } from "@/hooks/payouts";
import type { CuratorEarningsDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

type CheckpointRow = CuratorEarningsDto["checkpoints"][number];
type PayoutRow = CuratorEarningsDto["payouts"][number];

const PAID_WORK_HREF = "/advisor/settings?section=paid-work";
const PAGINATION = { pageSize: 12, hideOnSinglePage: true };
// The least the flexible first column shrinks to before the table scrolls.
const PROJECT_WIDTH = 320;
const MONTH_WIDTH = 240;

const TONE: Record<CheckpointRow["status"], StatusTone> = {
	earned: "info",
	due: "warning",
	paid: "success",
	noFee: "neutral",
};

const day = (at: string) => dayjs.utc(at).format("D MMM");
const month = (at: string) => dayjs.utc(at).format("MMMM");

export type EarningsPageProps = {
	data: CuratorEarningsDto | undefined;
	status: "pending" | "error" | "success";
	onRetry: () => void;
};

/** Frames 13.4, 13.4b and 13.4c: what a curator earned, is owed and was paid. */
export function EarningsPage({ data, status, onRetry }: EarningsPageProps) {
	const { t } = useTranslate();
	const feeReason = useFeeReasonLabel("curator");

	const loading = status === "pending";
	const failed = status === "error";
	const skeleton = <Skeleton.Input active size="small" />;
	const none = <span className={table.none}>—</span>;
	const money = (minor: number) => (
		<span className={table.number}>{formatMoneyCents(minor)}</span>
	);

	const reasonLabel = (row: CheckpointRow) => {
		const reason = row.reason ?? row.noFee;
		return reason && feeReason(reason, row.parts);
	};

	const statusLabels: Record<CheckpointRow["status"], string> = {
		earned: t("advisor.earnings.status.earned", "Earned"),
		due: t("advisor.earnings.status.due", "Due"),
		paid: t("advisor.earnings.status.paid", "Paid"),
		noFee: t("advisor.earnings.status.noFee", "No fee"),
	};

	const statusNote = (row: CheckpointRow) => {
		if (!row.on) return null;
		if (row.status === "earned") {
			return t("advisor.earnings.kpi.paidBy", "Paid by {date}", {
				date: day(row.on),
			});
		}
		if (row.status === "due") {
			return t("advisor.earnings.status.by", "By {date}", {
				date: day(row.on),
			});
		}
		return row.status === "paid" ? day(row.on) : null;
	};

	const stacked = (main: ReactNode, sub: ReactNode, end = false) => (
		<Flex vertical gap={2} align={end ? "flex-end" : undefined}>
			{main}
			{sub && (
				<Typography.Text type="secondary" className={styles.sub}>
					{sub}
				</Typography.Text>
			)}
		</Flex>
	);

	const checkpointColumns: ColumnsType<CheckpointRow> = [
		{
			title: t("advisor.earnings.column.project", "Project"),
			key: "project",
			render: (_, row) =>
				stacked(
					row.projectName ? (
						<Typography.Text strong ellipsis={{ tooltip: true }}>
							{row.projectName}
						</Typography.Text>
					) : (
						none
					),
					[
						t("checkpoints.number", "Checkpoint {number}", {
							number: row.number,
						}),
						row.stageName,
					]
						.filter(Boolean)
						.join(" · "),
				),
		},
		{
			title: t("advisor.earnings.column.closed", "Closed"),
			key: "closed",
			width: 160,
			render: (_, row) => (
				<span className={styles.date}>{day(row.closedAt)}</span>
			),
		},
		{
			title: t("advisor.earnings.column.fee", "Fee"),
			key: "fee",
			width: 220,
			align: "right",
			render: (_, row) => stacked(money(row.fee), reasonLabel(row), true),
		},
		{
			title: t("advisor.earnings.column.status", "Status"),
			key: "status",
			width: 220,
			render: (_, row) =>
				stacked(
					<StatusDot
						tone={TONE[row.status]}
						label={statusLabels[row.status]}
					/>,
					statusNote(row),
				),
		},
	];

	const payoutColumns: ColumnsType<PayoutRow> = [
		{
			title: t("advisor.earnings.column.month", "Month earned"),
			key: "month",
			render: (_, row) => (
				<Typography.Text strong>
					{dayjs.utc(row.month).format("MMMM YYYY")}
				</Typography.Text>
			),
		},
		{
			title: t("advisor.earnings.column.count", "Checkpoints"),
			key: "count",
			width: 160,
			align: "center",
			render: (_, row) => <span className={table.number}>{row.count}</span>,
		},
		{
			title: t("advisor.earnings.column.amount", "Amount"),
			key: "amount",
			width: 220,
			align: "right",
			render: (_, row) => money(row.amount),
		},
		{
			title: t("advisor.earnings.column.paidOn", "Paid on"),
			key: "paidOn",
			width: 220,
			render: (_, row) => (
				<span className={styles.date}>{day(row.paidOn)}</span>
			),
		},
		{
			title: t("advisor.earnings.column.reference", "Reference"),
			key: "reference",
			width: 240,
			render: (_, row) => (
				<Typography.Text type="secondary" ellipsis={{ tooltip: true }}>
					{row.reference}
				</Typography.Text>
			),
		},
	];

	const error = (
		<EmptyState
			size="compact"
			icon={IconAlertCircle}
			tint="var(--gd-danger-tint)"
			ink="var(--gd-danger-on-tint)"
			title={t("advisor.earnings.error.title", "Couldn't load your earnings")}
			description={t(
				"advisor.earnings.error.description",
				"The server did not answer. Try again in a moment.",
			)}
			action={
				<Button icon={<IconRefresh size={16} />} onClick={onRetry}>
					{t("advisor.earnings.error.retry", "Try again")}
				</Button>
			}
		/>
	);

	const emptyText = (text: string) => (
		<Typography.Text type="secondary">{text}</Typography.Text>
	);

	const figure = (minor: number | undefined) =>
		failed ? "—" : minor === undefined ? skeleton : formatMoneyCents(minor);

	const since = data?.paidTotal.since;
	const paidNote =
		data &&
		(since && data.paidTotal.count > 0
			? t(
					"advisor.earnings.kpi.payoutsSince",
					"{count, plural, one {# payout} other {# payouts}} since {month}",
					{ count: data.paidTotal.count, month: month(since) },
				)
			: t("advisor.earnings.kpi.noPayouts", "No payouts yet"));

	const waiting = data ? data.due.amount || data.earned.amount : 0;
	const checkpoints = data?.checkpoints ?? [];
	const payouts = data?.payouts ?? [];

	return (
		<div className="layout-background">
			<ProtectedPageHeader
				title={t("advisor.earnings.title", "Earnings")}
				subTitle={t(
					"advisor.earnings.sub",
					"Fees for the checkpoints you curate.",
				)}
				extra={
					data?.account && (
						<Flex gap={8} align="center" className={styles.account}>
							<span className={styles.paidTo}>
								{t("advisor.earnings.paidTo", "Paid to {account}", {
									account: data.account,
								})}
							</span>
							<Link href={PAID_WORK_HREF} className={styles.change}>
								{t("advisor.earnings.change", "Change")}
							</Link>
						</Flex>
					)
				}
			/>

			<div className={styles.page}>
				{data && !data.account && (
					<Alert
						type="warning"
						showIcon
						icon={<IconAlertTriangle size={16} />}
						title={t(
							"advisor.earnings.noDetails.title",
							"Add your payout details to get paid",
						)}
						description={
							waiting > 0 &&
							t(
								"advisor.earnings.noDetails.body",
								"{amount} is waiting. We pay by bank transfer once the details are in.",
								{ amount: formatMoneyCents(waiting) },
							)
						}
						action={
							<Link href={PAID_WORK_HREF}>
								<Button size="small">
									{t("advisor.earnings.noDetails.action", "Add payout details")}
								</Button>
							</Link>
						}
					/>
				)}

				<div className={styles.kpis}>
					<KpiCard
						icon={IconTrendingUp}
						name={
							data
								? t("advisor.earnings.kpi.earned", "Earned in {month}", {
										month: month(data.earned.month),
									})
								: t("advisor.earnings.status.earned", "Earned")
						}
						value={figure(data?.earned.amount)}
						note={
							data &&
							t("advisor.earnings.kpi.paidBy", "Paid by {date}", {
								date: day(data.earned.dueOn),
							})
						}
					/>
					<KpiCard
						icon={IconCalendarDue}
						name={
							data
								? t("advisor.earnings.kpi.due", "Due on {date}", {
										date: day(data.due.dueOn),
									})
								: t("advisor.earnings.status.due", "Due")
						}
						value={figure(data?.due.amount)}
						note={
							data &&
							t("advisor.earnings.kpi.dueNote", "Earned in {month}", {
								month: month(data.due.month),
							})
						}
					/>
					<KpiCard
						icon={IconCircleCheck}
						name={t("advisor.earnings.kpi.paidTotal", "Paid in total")}
						value={figure(data?.paidTotal.amount)}
						note={paidNote}
					/>
				</div>

				<Flex vertical gap={16}>
					<SectionHeading
						level={3}
						title={t("advisor.earnings.checkpoints", "Checkpoints")}
					/>
					<Table<CheckpointRow>
						className={table.table}
						rowKey={(row) => row.feeId ?? row.checkpointId ?? row.closedAt}
						columns={
							loading ? skeletonColumns(checkpointColumns) : checkpointColumns
						}
						dataSource={
							loading ? skeletonRows<CheckpointRow>(3, "feeId") : checkpoints
						}
						pagination={PAGINATION}
						scroll={{ x: tableScrollX(checkpointColumns, PROJECT_WIDTH) }}
						locale={{
							emptyText: failed
								? error
								: emptyText(
										t(
											"advisor.earnings.empty",
											"No checkpoint of yours has closed yet",
										),
									),
						}}
					/>
				</Flex>

				{!failed && (
					<Flex vertical gap={16}>
						<SectionHeading
							level={3}
							title={t("advisor.earnings.payouts", "Payouts")}
						/>
						<Table<PayoutRow>
							className={table.table}
							rowKey="month"
							columns={loading ? skeletonColumns(payoutColumns) : payoutColumns}
							dataSource={
								loading ? skeletonRows<PayoutRow>(3, "month") : payouts
							}
							pagination={PAGINATION}
							scroll={{ x: tableScrollX(payoutColumns, MONTH_WIDTH) }}
							locale={{
								emptyText: emptyText(
									t("advisor.earnings.noPayouts", "No payouts yet"),
								),
							}}
						/>
					</Flex>
				)}
			</div>
		</div>
	);
}
