"use client";

import { IconExternalLink } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Flex, Skeleton, type TableProps, Tag, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import { ModernTable } from "@/components/ModernTable";
import { LoadError } from "@/components/ui/LoadError";
import type {
	MyAcceptance,
	MyCertificate,
} from "@/repositories/legal/my-documents";
import styles from "./style.module.scss";

const { Text, Title } = Typography;

export type MyDocumentsData = {
	acceptances: MyAcceptance[];
	certificates: MyCertificate[];
};

const day = (date: string) => dayjs(date).format("D MMM YYYY");

/** Frame `CJGPi`: what the user accepted, each opening the exact text, and what they were issued. */
export function MyDocumentsView({
	data,
	loading,
	error,
	onRetry,
}: {
	data?: MyDocumentsData;
	loading?: boolean;
	error?: boolean;
	onRetry?: () => void;
}) {
	const { t } = useTranslate();

	if (error)
		return (
			<LoadError
				title={t("legal.my.error", "Your documents could not be loaded")}
				onRetry={onRetry}
			/>
		);

	const empty = (text: string) => ({
		emptyText: <Text className={styles.empty}>{text}</Text>,
	});

	const acceptanceColumns: TableProps<MyAcceptance>["columns"] = [
		{
			title: t("legal.my.document", "Document"),
			key: "title",
			render: (_, row) => (
				<Flex vertical>
					<Text>{row.title}</Text>
					{row.subject && <Text className={styles.subject}>{row.subject}</Text>}
				</Flex>
			),
		},
		{
			title: t("legal.my.version", "Version"),
			dataIndex: "version",
			render: (v: number) => <Text className={styles.meta}>v{v}</Text>,
		},
		{
			title: t("legal.my.accepted", "Accepted"),
			dataIndex: "acceptedAt",
			render: (date: string) => (
				<Text className={styles.meta}>{day(date)}</Text>
			),
		},
		{
			key: "open",
			align: "right",
			render: (_, row) =>
				row.href && (
					<Link href={row.href} target="_blank" className={styles.action}>
						{t("legal.my.open", "Open")} <IconExternalLink size={12} />
					</Link>
				),
		},
	];

	const certificateColumns: TableProps<MyCertificate>["columns"] = [
		{ title: t("legal.my.certificate", "Certificate"), dataIndex: "title" },
		{
			title: t("legal.my.source", "Source"),
			dataIndex: "source",
			render: (source: string) => (
				<Tag>{t(`legal.certificate.source.${source}`, source)}</Tag>
			),
		},
		{ title: t("legal.my.number", "Number"), dataIndex: "number" },
		{
			title: t("legal.my.issued", "Issued"),
			dataIndex: "issuedAt",
			render: (date: string) => (
				<Text className={styles.meta}>{day(date)}</Text>
			),
		},
		{
			key: "verify",
			align: "right",
			render: (_, row) => (
				<Link
					href={`/verify/${row.number}`}
					target="_blank"
					className={styles.action}
				>
					{t("legal.my.verify", "Verify")} <IconExternalLink size={12} />
				</Link>
			),
		},
	];

	const table = <T extends object>(
		columns: TableProps<T>["columns"],
		rows: T[] | undefined,
		emptyText: string,
	) =>
		loading ? (
			<Skeleton active title={false} paragraph={{ rows: 3 }} />
		) : (
			<ModernTable<T>
				rowKey="id"
				surface="page"
				className={styles.table}
				columns={columns}
				dataSource={rows}
				pagination={false}
				locale={empty(emptyText)}
			/>
		);

	return (
		<Flex vertical gap={32}>
			<section>
				<Title level={4}>
					{t("legal.my.accepted-title", "Accepted documents")}
				</Title>
				{table(
					acceptanceColumns,
					data?.acceptances,
					t("legal.my.no-acceptances", "No accepted documents yet."),
				)}
			</section>
			<section>
				<Title level={4}>
					{t("legal.my.certificates-title", "Certificates")}
				</Title>
				{table(
					certificateColumns,
					data?.certificates,
					t("legal.my.no-certificates", "No certificates yet."),
				)}
			</section>
		</Flex>
	);
}

export function MyDocuments() {
	const { data, isLoading, isError, refetch } = useQuery({
		queryKey: ["my-legal-documents"],
		queryFn: () =>
			axios
				.get<MyDocumentsData>("/api/user/legal/documents")
				.then((r) => r.data),
	});
	return (
		<MyDocumentsView
			data={data}
			loading={isLoading}
			error={isError}
			onRetry={() => refetch()}
		/>
	);
}
