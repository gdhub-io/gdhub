"use client";

import { IconAlertCircle, IconInfoCircle, IconMail } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	Alert,
	App,
	Button,
	Divider,
	Flex,
	Modal,
	Radio,
	Skeleton,
	Tooltip,
	Typography,
} from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { formatCheckpointMoney } from "@/config/checkpoint-pricing";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import {
	useIssueRefund,
	useRefundQuote,
	useRefundReasonLabels,
} from "@/hooks/admin-checkpoints";
import type { RefundReason } from "@/lib/checkpoint-refund";
import styles from "./style.module.scss";

export type RefundCheckpointModalProps = {
	checkpoint: { id: string; number: number; projectName: string } | null;
	onClose: () => void;
};

/**
 * Frames 11.6–11.6d: the admin picks why, reads what the server worked out,
 * and confirms. The sums are the server's; this only shows them.
 */
export function RefundCheckpointModal({
	checkpoint,
	onClose,
}: RefundCheckpointModalProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const quote = useRefundQuote(checkpoint?.id);
	const issue = useIssueRefund(checkpoint?.id ?? "");
	const [reason, setReason] = useState<RefundReason>();

	const data = quote.data;
	const labels = useRefundReasonLabels();

	const submit = () => {
		if (!reason || !data) return;
		issue.mutate(reason, {
			onSuccess: ({ refunded }) => {
				message.success(
					t("admin.checkpoints.refund.success", "Refunded {amount}", {
						amount: formatCheckpointMoney(refunded),
					}),
				);
				onClose();
			},
		});
	};

	const paidOn = data ? dayjs(data.paidAt).format("D MMM") : "";
	const note = (value: RefundReason) => {
		if (value !== "withdrawal" || !data) return null;
		const refused = data.reasons.find((row) => row.reason === value)?.refused;

		return refused === "withdrawalOver"
			? t(
					"admin.checkpoints.refund.withdrawal.over",
					"Paid {date} — the 14 days are over",
					{ date: paidOn },
				)
			: t(
					"admin.checkpoints.refund.withdrawal.within",
					"Only within 14 days of payment — paid {date}, {days} days ago.",
					{ date: paidOn, days: dayjs().diff(data.paidAt, "day") },
				);
	};

	const done = data?.refunded;

	const body = () => {
		if (!data) return <Skeleton active paragraph={{ rows: 6 }} />;

		if (done)
			return (
				<Alert
					type="info"
					showIcon
					icon={<IconInfoCircle size={16} />}
					message={t(
						"admin.checkpoints.refund.done",
						"Refunded {amount} on {date} · {reason}",
						{
							amount: formatCheckpointMoney(done.amount),
							date: dayjs(done.at).format("D MMM"),
							reason: done.reason ? labels[done.reason] : "",
						},
					)}
				/>
			);

		const ai = data.curatorKind === CheckpointCuratorKind.AI;
		const delivered = data.provided - (data.verdictSent ? 1 : 0);

		return (
			<Flex vertical gap={20}>
				{issue.isError && (
					<Alert
						type="error"
						showIcon
						icon={<IconAlertCircle size={16} />}
						message={t(
							"admin.checkpoints.refund.stripeFailed",
							"Stripe did not refund — nothing was recorded. Try again.",
						)}
					/>
				)}

				<Flex vertical gap={8}>
					<Typography.Text strong>
						{t("admin.checkpoints.refund.reasonLabel", "Reason")}
					</Typography.Text>
					<Radio.Group
						value={reason}
						onChange={(event) => setReason(event.target.value)}
					>
						<Flex vertical gap={12}>
							{data.reasons.map((row) => {
								const hint = note(row.reason);

								return (
									<Flex key={row.reason} vertical gap={2}>
										<Radio value={row.reason} disabled={!!row.refused}>
											{labels[row.reason]}
										</Radio>
										{hint && (
											<Typography.Text type="secondary" className={styles.note}>
												{hint}
											</Typography.Text>
										)}
									</Flex>
								);
							})}
						</Flex>
					</Radio.Group>
				</Flex>

				<div className={styles.breakdown}>
					<Flex justify="space-between">
						<Typography.Text type="secondary">
							{t("admin.checkpoints.refund.paid", "Paid")}
						</Typography.Text>
						<Typography.Text className={styles.value}>
							{formatCheckpointMoney(data.paid)}
						</Typography.Text>
					</Flex>
					<Flex justify="space-between" align="flex-start">
						<Flex vertical>
							<Typography.Text type="secondary">
								{t("admin.checkpoints.refund.partsProvided", "Parts provided")}
							</Typography.Text>
							<Typography.Text className={styles.sub}>
								{ai
									? t(
											"admin.checkpoints.refund.partsDetail.ai",
											"Reviews written {reviews} · verdict {verdictSent, select, true {sent} other {not sent}}",
											{ reviews: delivered, verdictSent: data.verdictSent },
										)
									: t(
											"admin.checkpoints.refund.partsDetail.human",
											"Calls held {calls} · verdict {verdictSent, select, true {sent} other {not sent}}",
											{ calls: delivered, verdictSent: data.verdictSent },
										)}
							</Typography.Text>
						</Flex>
						<Typography.Text className={styles.value}>
							{t(
								"admin.checkpoints.refund.partsValue",
								"{provided} of {total}",
								{
									provided: data.provided,
									total: data.parts,
								},
							)}
						</Typography.Text>
					</Flex>
					<Flex justify="space-between">
						<Typography.Text type="secondary">
							{t("admin.checkpoints.refund.onePart", "One part")}
						</Typography.Text>
						<Typography.Text className={styles.value}>
							{formatCheckpointMoney(data.part)}
						</Typography.Text>
					</Flex>
					<Divider className={styles.divider} />
					<Flex justify="space-between" align="center">
						<Typography.Text strong className={styles.totalLabel}>
							{t("admin.checkpoints.refund.amount", "Refund")}
						</Typography.Text>
						<Typography.Text strong className={styles.total}>
							{reason ? formatCheckpointMoney(data.refund) : "—"}
						</Typography.Text>
					</Flex>
				</div>

				<Flex gap={8} align="center">
					<IconMail size={16} className={styles.mail} />
					<Typography.Text type="secondary">
						{t(
							"admin.checkpoints.refund.consequence",
							"The checkpoint closes; the author gets an email.",
						)}
					</Typography.Text>
				</Flex>
			</Flex>
		);
	};

	return (
		<Modal
			open={!!checkpoint}
			width={560}
			title={
				checkpoint &&
				t(
					"admin.checkpoints.refund.title",
					"Refund {project} · Checkpoint {number}",
					{ project: checkpoint.projectName, number: checkpoint.number },
				)
			}
			onCancel={onClose}
			closable={!issue.isPending}
			mask={{ closable: !issue.isPending }}
			destroyOnHidden
			footer={
				done ? (
					<Button onClick={onClose}>{t("common.close", "Close")}</Button>
				) : (
					<Flex justify="flex-end" gap={8}>
						<Button onClick={onClose} disabled={issue.isPending}>
							{t("common.cancel", "Cancel")}
						</Button>
						<Tooltip
							title={
								!reason &&
								t("admin.checkpoints.refund.pickReason", "Pick a reason")
							}
						>
							<Button
								type="primary"
								onClick={submit}
								loading={issue.isPending}
								disabled={!reason || !data}
							>
								{reason && data
									? t("admin.checkpoints.refund.submit", "Refund {amount}", {
											amount: formatCheckpointMoney(data.refund),
										})
									: t("admin.checkpoints.refund.amount", "Refund")}
							</Button>
						</Tooltip>
					</Flex>
				)
			}
		>
			{body()}
		</Modal>
	);
}
