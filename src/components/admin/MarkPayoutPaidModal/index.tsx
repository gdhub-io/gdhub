"use client";

import {
	IconAlertCircle,
	IconCheck,
	IconCopy,
	IconInfoCircle,
	IconMail,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	Alert,
	App,
	Button,
	DatePicker,
	Divider,
	Flex,
	Form,
	Input,
	Modal,
	Skeleton,
	Tooltip,
	Typography,
} from "antd";
import { isAxiosError } from "axios";
import dayjs, { type Dayjs } from "dayjs";
import { type ReactNode, useId, useState } from "react";
import {
	firstName,
	formatPayoutMoney,
	useInvoicingLabels,
} from "@/components/admin/PayoutsTable/format";
import type { ExpertInvoicing } from "@/config/prisma-enums";
import { useMarkPayoutPaid, usePayoutDetails } from "@/hooks/payouts";
import type { AdminPayoutRowDto, PayoutDetailsDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

export type AlreadyPaid = {
	paidOn: string;
	reference: string;
	paidBy: string | null;
};

type ApiError = {
	error?: string;
	details?: { paid?: AlreadyPaid | null };
};

export type MarkPayoutPaidModalProps = {
	row: AdminPayoutRowDto | null;
	/** The month's first day, UTC, as the list returns it. */
	month: string;
	onClose: () => void;
};

/** Frames 13.3 / 13.3b: reads the full details on opening and records the transfer. */
export function MarkPayoutPaidModal({
	row,
	month,
	onClose,
}: MarkPayoutPaidModalProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const details = usePayoutDetails(row?.curatorId);
	const mark = useMarkPayoutPaid();
	const [alreadyPaid, setAlreadyPaid] = useState<AlreadyPaid | null>(null);
	const [failure, setFailure] = useState<"detailsChanged" | "other" | null>(
		null,
	);

	const submit = ({ paidOn, reference }: MarkPaidForm) => {
		if (!row || !details.data) return;
		setFailure(null);
		mark.mutate(
			{
				curatorId: row.curatorId,
				month: dayjs.utc(month).format("YYYY-MM"),
				paidOn,
				reference,
				detailsSeenAt: details.data.seenAt,
			},
			{
				onSuccess: () => {
					message.success(
						t(
							"admin.payouts.markPaid.success",
							"Marked paid — {name} gets an email",
							{ name: firstName(row.name) },
						),
					);
					onClose();
				},
				onError: (error) => {
					const body = isAxiosError<ApiError>(error)
						? error.response?.data
						: undefined;
					if (body?.error === "alreadyPaid") {
						setAlreadyPaid(
							body.details?.paid ?? { paidOn: "", reference: "", paidBy: null },
						);
						return;
					}
					if (body?.error === "detailsChanged") {
						setFailure("detailsChanged");
						details.refetch();
						return;
					}
					setFailure("other");
				},
			},
		);
	};

	return (
		<MarkPayoutPaidDialog
			open={!!row}
			name={row?.name ?? ""}
			month={month}
			amount={row?.amount ?? 0}
			count={row?.checkpoints.length ?? 0}
			details={details.data}
			alreadyPaid={alreadyPaid}
			failure={failure}
			submitting={mark.isPending}
			onSubmit={submit}
			onClose={onClose}
		/>
	);
}

export type MarkPaidForm = { paidOn: string; reference: string };

export type MarkPayoutPaidDialogProps = {
	open: boolean;
	name: string;
	month: string;
	amount: number;
	count: number;
	/** Undefined while they load. */
	details: PayoutDetailsDto | undefined;
	alreadyPaid: AlreadyPaid | null;
	failure: "detailsChanged" | "other" | null;
	submitting: boolean;
	onSubmit: (form: MarkPaidForm) => void;
	onClose: () => void;
	/** What the reference field opens with; the stories show a typed one. */
	defaultReference?: string;
};

/** The dialog itself, all state passed in; the stories render it straight. */
export function MarkPayoutPaidDialog({
	open,
	name,
	month,
	amount,
	count,
	details,
	alreadyPaid,
	failure,
	submitting,
	onSubmit,
	onClose,
	defaultReference = "",
}: MarkPayoutPaidDialogProps) {
	const { t } = useTranslate();
	const invoicing = useInvoicingLabels();
	const [paidOn, setPaidOn] = useState<Dayjs>(() => dayjs());
	const [reference, setReference] = useState(defaultReference);
	const id = useId();

	const monthName = dayjs.utc(month).format("MMMM");
	const total = formatPayoutMoney(amount);
	const ready = !!reference.trim() && !!details;

	const invoicingNotes: Record<ExpertInvoicing, string> = {
		SelfEmployed: t(
			"admin.payouts.markPaid.invoicingNote.selfEmployed",
			"Invoice from the curator",
		),
		Company: t(
			"admin.payouts.markPaid.invoicingNote.company",
			"Invoice from the company",
		),
		SelfBilling: t(
			"admin.payouts.markPaid.invoicingNote.selfBilling",
			"We issue the self-billing document",
		),
	};

	const copyable = (text: string) => ({
		text,
		icon: [
			<IconCopy key="copy" size={16} />,
			<IconCheck key="copied" size={16} />,
		],
		tooltips: [
			t("admin.payouts.markPaid.copy", "Copy"),
			t("admin.payouts.markPaid.copied", "Copied"),
		],
	});

	const line = (label: ReactNode, value: ReactNode) => (
		<Flex justify="space-between" align="center" gap={16}>
			{label}
			{value}
		</Flex>
	);

	const body = () => {
		if (alreadyPaid)
			return (
				<Alert
					type="info"
					showIcon
					icon={<IconInfoCircle size={16} />}
					title={t(
						"admin.payouts.markPaid.alreadyPaid",
						"Already paid on {date} · ref {reference}",
						{
							date: alreadyPaid.paidOn
								? dayjs.utc(alreadyPaid.paidOn).format("D MMM")
								: "—",
							reference: alreadyPaid.reference || "—",
						},
					)}
					description={t(
						"admin.payouts.markPaid.alreadyPaidNote",
						"Marked by {admin}. Nothing was changed.",
						{ admin: alreadyPaid.paidBy ?? "—" },
					)}
				/>
			);

		return (
			<Flex vertical gap={20}>
				{failure && (
					<Alert
						type="error"
						showIcon
						icon={<IconAlertCircle size={16} />}
						title={
							failure === "detailsChanged"
								? t(
										"admin.payouts.markPaid.detailsChanged",
										"The payout details changed — check them and try again",
									)
								: t(
										"admin.payouts.markPaid.failed",
										"Couldn't mark it paid. Try again.",
									)
						}
					/>
				)}

				<div className={styles.block}>
					{details ? (
						<>
							{line(
								<Typography.Text>
									{t("admin.payouts.markPaid.holder", "Account holder")}
								</Typography.Text>,
								details.holder ? (
									<Typography.Text
										className={styles.copy}
										copyable={copyable(details.holder)}
									>
										{details.holder}
									</Typography.Text>
								) : (
									<span className={styles.none}>—</span>
								),
							)}
							{line(
								<Typography.Text>
									{t("admin.payouts.markPaid.iban", "IBAN")}
								</Typography.Text>,
								details.account ? (
									<Typography.Text
										className={`${styles.copy} ${styles.number}`}
										copyable={copyable(details.account)}
									>
										{details.account}
									</Typography.Text>
								) : (
									<span className={styles.none}>—</span>
								),
							)}
							{line(
								<Flex vertical gap={2}>
									<Typography.Text>
										{t("admin.payouts.markPaid.invoicing", "Invoicing")}
									</Typography.Text>
									{details.invoicing && (
										<Typography.Text type="secondary" className={styles.sub}>
											{invoicingNotes[details.invoicing]}
										</Typography.Text>
									)}
								</Flex>,
								<Typography.Text>
									{details.invoicing ? invoicing[details.invoicing] : "—"}
								</Typography.Text>,
							)}
						</>
					) : (
						<Skeleton active title={false} paragraph={{ rows: 3 }} />
					)}
					<Divider className={styles.divider} />
					{line(
						<Flex vertical gap={2}>
							<Typography.Text strong className={styles.amountLabel}>
								{t("admin.payouts.markPaid.amount", "Amount")}
							</Typography.Text>
							<Typography.Text type="secondary" className={styles.sub}>
								{t(
									"admin.payouts.markPaid.amountNote",
									"{count, plural, one {# checkpoint} other {# checkpoints}} closed in {month}",
									{ count, month: monthName },
								)}
							</Typography.Text>
						</Flex>,
						<Typography.Text strong className={styles.amount}>
							{total}
						</Typography.Text>,
					)}
				</div>

				<Form layout="vertical" requiredMark={false} className={styles.fields}>
					<Form.Item
						className={styles.date}
						label={t("admin.payouts.markPaid.date", "Transfer date")}
						htmlFor={`${id}-date`}
					>
						<DatePicker
							id={`${id}-date`}
							className={styles.full}
							variant="filled"
							format="D MMM YYYY"
							allowClear={false}
							value={paidOn}
							onChange={(value) => value && setPaidOn(value)}
							disabledDate={(day) => day.isAfter(dayjs(), "day")}
							disabled={submitting}
						/>
					</Form.Item>
					<Form.Item
						className={styles.reference}
						label={t("admin.payouts.markPaid.reference", "Reference")}
						htmlFor={`${id}-reference`}
					>
						<Input
							id={`${id}-reference`}
							variant="filled"
							maxLength={140}
							value={reference}
							onChange={(event) => setReference(event.target.value)}
							disabled={submitting}
						/>
					</Form.Item>
				</Form>

				<Flex gap={8} align="center">
					<IconMail size={16} className={styles.mail} />
					<Typography.Text type="secondary">
						{t(
							"admin.payouts.markPaid.consequence",
							"{name} gets an email. A paid month can't be edited later.",
							{ name: firstName(name) },
						)}
					</Typography.Text>
				</Flex>
			</Flex>
		);
	};

	return (
		<Modal
			open={open}
			width={560}
			title={t("admin.payouts.markPaid.title", "Mark {name}'s {month} paid", {
				name,
				month: monthName,
			})}
			onCancel={onClose}
			closable={!submitting}
			mask={{ closable: !submitting }}
			destroyOnHidden
			footer={
				alreadyPaid ? (
					<Button onClick={onClose}>{t("common.close", "Close")}</Button>
				) : (
					<Flex justify="flex-end" gap={8}>
						<Button onClick={onClose} disabled={submitting}>
							{t("common.cancel", "Cancel")}
						</Button>
						<Tooltip
							title={
								!reference.trim() &&
								t(
									"admin.payouts.markPaid.referenceMissing",
									"Type the bank reference",
								)
							}
						>
							<Button
								type="primary"
								loading={submitting}
								disabled={!ready}
								onClick={() =>
									onSubmit({
										paidOn: paidOn.format("YYYY-MM-DD"),
										reference: reference.trim(),
									})
								}
							>
								{t("admin.payouts.markPaid.submit", "Mark {amount} paid", {
									amount: total,
								})}
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
