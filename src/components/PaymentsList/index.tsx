"use client";

import type {
	PayableType,
	PaymentProvider,
	PaymentStatus,
} from "@gdhub-io/gdhub-prisma";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { App, Button, Table, type TableProps, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import { useState } from "react";
import {
	StatusDot,
	type StatusTone,
	skeletonColumns,
	skeletonRows,
} from "@/components/ui";

const { Title, Text } = Typography;

type UserPayment = {
	id: string;
	amount: number;
	currency: string;
	status: PaymentStatus;
	provider: PaymentProvider;
	payableType: PayableType;
	payableId: string;
	createdAt: string;
	completedAt: string | null;
	hasInvoice: boolean;
	number: number | null;
	title: string | null;
	projectName: string | null;
};

const STATUS_TONES: Record<string, StatusTone> = {
	COMPLETED: "success",
	PENDING: "warning",
	PROCESSING: "warning",
	FAILED: "danger",
	CANCELED: "neutral",
	REFUNDED: "neutral",
	PARTIALLY_REFUNDED: "neutral",
	DISPUTED: "danger",
};

function formatAmount(amountMinor: number, currency: string) {
	try {
		return new Intl.NumberFormat("en", {
			style: "currency",
			currency,
		}).format(amountMinor / 100);
	} catch {
		return `${(amountMinor / 100).toFixed(2)} ${currency}`;
	}
}

export default function PaymentsList() {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const [invoiceLoadingId, setInvoiceLoadingId] = useState<string>();

	const { data, isPending } = useQuery({
		queryKey: ["user-payments"],
		queryFn: () => axios.get<UserPayment[]>("/api/user/payments"),
		refetchOnWindowFocus: false,
	});

	// Two providers, two receipts. Paddle's hangs off the vacancy that was paid
	// for; Stripe's off the payment row itself, and both are fetched when asked
	// rather than stored — the document is theirs, not ours.
	const openInvoice = async (payment: UserPayment) => {
		setInvoiceLoadingId(payment.id);
		try {
			const res =
				payment.provider === "PADDLE"
					? await axios.get<{ url: string }>(
							"/api/user/project/vacancy/payment/invoice",
							{ params: { vacancyId: payment.payableId } },
						)
					: await axios.get<{ url: string }>("/api/user/payment/receipt", {
							params: { paymentId: payment.id },
						});

			if (res.data?.url) window.open(res.data.url, "_blank", "noopener");
		} catch {
			message.error(
				t("settings.payments.receiptFailed", "The receipt could not be opened"),
			);
		} finally {
			setInvoiceLoadingId(undefined);
		}
	};

	// What was bought, in words. Without this a checkpoint reads as the enum
	// value itself — `CHECKPOINT` — in the middle of a receipts table.
	const described = (payable: PayableType) => {
		if (payable === "VACANCY")
			return t("settings.payments.vacancyFee", "Vacancy listing");
		if (payable === "CHECKPOINT")
			return t("settings.payments.checkpoint", "Checkpoint");

		return payable;
	};

	// A Stripe hold reads as a reservation, and a cancelled row — a checkout left
	// unfinished or a hold let go, which the row cannot tell apart — as what both
	// mean to the payer: nothing was taken.
	const statusLabel = (payment: UserPayment) => {
		if (payment.status === "CANCELED")
			return t("settings.payments.status.notCharged", "Not charged");
		if (payment.provider === "STRIPE" && payment.status === "PROCESSING")
			return t("settings.payments.status.reserved", "Reserved");

		return t(`vacancy.payment.status.${payment.status}`, payment.status);
	};

	// What happened to the money before its current status, from the two dates
	// the row keeps. A refund's own date is not on the row, so it goes undated.
	const history = (payment: UserPayment) => {
		const reserved = dayjs(payment.createdAt);
		const charged = payment.completedAt ? dayjs(payment.completedAt) : null;

		if (payment.provider === "STRIPE" && payment.status === "PROCESSING") {
			return t(
				"settings.payments.history.reserved",
				"Reserved {date} · not charged yet",
				{ date: reserved.format("ll") },
			);
		}

		if (payment.status === "COMPLETED" && charged) {
			return payment.provider === "STRIPE" && !charged.isSame(reserved, "day")
				? t(
						"settings.payments.history.reservedCharged",
						"Reserved {reserved} → charged {charged}",
						{ reserved: reserved.format("ll"), charged: charged.format("ll") },
					)
				: null;
		}

		if (
			(payment.status === "REFUNDED" ||
				payment.status === "PARTIALLY_REFUNDED") &&
			charged
		) {
			return t(
				"settings.payments.history.chargedRefunded",
				"Charged {charged} → refunded",
				{ charged: charged.format("ll") },
			);
		}

		return null;
	};

	const columns: TableProps<UserPayment>["columns"] = [
		{
			title: t("settings.payments.column.date", "Date"),
			key: "date",
			render: (_v, r) => dayjs(r.completedAt ?? r.createdAt).format("ll"),
		},
		{
			title: t("settings.payments.column.description", "Description"),
			key: "description",
			render: (_v, r) => (
				<div style={{ display: "flex", flexDirection: "column" }}>
					<Text>
						{r.number
							? `${described(r.payableType)} ${r.number}`
							: described(r.payableType)}
					</Text>
					{r.title || r.projectName ? (
						<Text type="secondary" style={{ fontSize: 12 }}>
							{[r.title, r.projectName].filter(Boolean).join(" · ")}
						</Text>
					) : (
						// A cancelled checkpoint is deleted, and its payment outlives it.
						// An empty line under the label reads as a bug rather than as a
						// purchase that was undone.
						<Text type="secondary" style={{ fontSize: 12 }}>
							{t("settings.payments.gone", "No longer exists")}
						</Text>
					)}
				</div>
			),
		},
		{
			title: t("settings.payments.column.amount", "Amount"),
			key: "amount",
			render: (_v, r) => formatAmount(r.amount, r.currency),
		},
		{
			title: t("settings.payments.column.status", "Status"),
			key: "status",
			render: (_v, r) => {
				const past = history(r);

				return (
					<div style={{ display: "flex", flexDirection: "column" }}>
						<StatusDot
							tone={STATUS_TONES[r.status] ?? "neutral"}
							label={statusLabel(r)}
						/>
						{past && (
							<Text type="secondary" style={{ fontSize: 12 }}>
								{past}
							</Text>
						)}
					</div>
				);
			},
		},
		{
			title: t("settings.payments.column.receipt", "Receipt"),
			key: "receipt",
			align: "right",
			render: (_v, r) =>
				r.hasInvoice ? (
					<Button
						size="small"
						loading={invoiceLoadingId === r.id}
						onClick={() => openInvoice(r)}
					>
						{t("settings.payments.download", "Download")}
					</Button>
				) : (
					<Text type="secondary">—</Text>
				),
		},
	];

	return (
		<div>
			<Title level={3}>{t("settings.payments.title", "Payments")}</Title>
			<Text type="secondary">
				{t(
					"settings.payments.subtitle",
					"Your payment history across the platform.",
				)}
			</Text>
			<Table<UserPayment>
				style={{ marginTop: 16 }}
				rowKey="id"
				columns={isPending ? skeletonColumns(columns) : columns}
				dataSource={
					isPending ? skeletonRows<UserPayment>(3, "id") : (data?.data ?? [])
				}
				pagination={false}
				locale={{
					emptyText: t("settings.payments.empty", "No payments yet"),
				}}
			/>
		</div>
	);
}
