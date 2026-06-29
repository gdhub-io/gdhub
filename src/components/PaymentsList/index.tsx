"use client";

import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Table, type TableProps, Tag, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import { useState } from "react";

const { Title, Text } = Typography;

type UserPayment = {
	id: string;
	amount: number;
	currency: string;
	status: prismaClient.PaymentStatus;
	payableType: prismaClient.PayableType;
	payableId: string;
	createdAt: string;
	completedAt: string | null;
	hasInvoice: boolean;
	title: string | null;
	projectName: string | null;
};

const STATUS_COLORS: Record<string, string> = {
	COMPLETED: "green",
	PENDING: "orange",
	PROCESSING: "orange",
	FAILED: "red",
	CANCELED: "default",
	REFUNDED: "default",
	PARTIALLY_REFUNDED: "default",
	DISPUTED: "volcano",
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
	const [invoiceLoadingId, setInvoiceLoadingId] = useState<string>();

	const { data, isLoading } = useQuery({
		queryKey: ["user-payments"],
		queryFn: () => axios.get<UserPayment[]>("/api/user/payments"),
		refetchOnWindowFocus: false,
	});

	const openInvoice = async (payment: UserPayment) => {
		if (payment.payableType !== "VACANCY") return;
		setInvoiceLoadingId(payment.id);
		try {
			const res = await axios.get<{ url: string }>(
				"/api/user/project/vacancy/payment/invoice",
				{ params: { vacancyId: payment.payableId } },
			);
			if (res.data?.url) window.open(res.data.url, "_blank", "noopener");
		} finally {
			setInvoiceLoadingId(undefined);
		}
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
						{r.payableType === "VACANCY"
							? t("settings.payments.vacancyFee", "Vacancy listing")
							: r.payableType}
					</Text>
					{(r.title || r.projectName) && (
						<Text type="secondary" style={{ fontSize: 12 }}>
							{[r.title, r.projectName].filter(Boolean).join(" · ")}
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
			render: (_v, r) => (
				<Tag color={STATUS_COLORS[r.status] ?? "default"}>
					{t(`vacancy.payment.status.${r.status}`, r.status)}
				</Tag>
			),
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
				loading={isLoading}
				columns={columns}
				dataSource={data?.data ?? []}
				pagination={false}
				locale={{
					emptyText: t("settings.payments.empty", "No payments yet"),
				}}
			/>
		</div>
	);
}
