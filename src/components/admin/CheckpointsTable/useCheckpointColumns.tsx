"use client";

import {
	IconDotsVertical,
	IconNotebook,
	IconReceiptRefund,
	IconSignature,
	IconUserPlus,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Divider, Dropdown, Flex, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useVerdictCopy } from "@/components/checkpoints/VerdictChip";
import {
	StatusDot,
	type StatusTone,
	tableStyles as styles,
} from "@/components/ui";
import {
	formatCheckpointMoney,
	formatMoneyCents,
	moneyOut,
	signedMoney,
} from "@/config/checkpoint-pricing";
import { CheckpointStatus } from "@/config/prisma-enums";
import { useRefundReasonLabels } from "@/hooks/admin-checkpoints";
import { useFeeReasonLabel } from "@/hooks/payouts";
import type { AdminCheckpointRowDto as Row } from "@/types/checkpoints";
import { BreakdownLine } from "./BreakdownLine";
import { RatingLine } from "./RatingLine";
import own from "./style.module.scss";

const TONE: Partial<Record<CheckpointStatus, StatusTone>> = {
	AwaitingCurator: "warning",
	Active: "success",
	Review: "info",
	Closed: "neutral",
	Cancelled: "neutral",
};

/** A cost that rounds to nothing is left out rather than written as $0. */
const spent = (minor: number) => Math.round(minor) > 0;

export function useCheckpointColumns({
	canManage,
	setRefunding,
	setDeciding,
	setAssigning,
	setReading,
}: {
	canManage: boolean;
	setRefunding: (row: Row) => void;
	setDeciding: (row: Row) => void;
	setAssigning: (row: Row) => void;
	setReading: (row: Row) => void;
}) {
	const { t } = useTranslate();

	const reasonLabels = useRefundReasonLabels();
	const feeReason = useFeeReasonLabel("admin");
	const { label: verdictLabel } = useVerdictCopy();
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
					{row.verdict && (
						<Typography.Text type="secondary" className={own.sub}>
							{t("admin.checkpoints.list.verdict", "Verdict: {verdict}", {
								verdict: verdictLabel(row.verdict),
							})}
						</Typography.Text>
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
					// A draft is not paid yet; anything past it ran without a payment.
					<span className={styles.none}>
						{row.status === CheckpointStatus.Draft
							? "—"
							: t("admin.checkpoints.list.free", "Free")}
					</span>
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
			width: 88,
			align: "right",
			render: (_, row) => {
				// Read often: always in the row, beside the menu.
				const journal = row.status !== CheckpointStatus.Draft && (
					<Tooltip
						title={t("admin.checkpoints.menu.journal", "Curator journal")}
					>
						<Button
							type="text"
							size="small"
							icon={<IconNotebook size={16} />}
							aria-label={t(
								"admin.checkpoints.menu.journal",
								"Curator journal",
							)}
							onClick={() => setReading(row)}
						/>
					</Tooltip>
				);
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
				const items = [
					...curating,
					...(curating.length && money.length
						? [{ type: "divider" as const }]
						: []),
					...money,
				];

				return (
					<Flex gap={4} justify="end">
						{journal}
						{items.length > 0 && (
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
						)}
					</Flex>
				);
			},
		},
	];

	return { columns, statusLabels };
}
