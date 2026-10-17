"use client";

import { IconExternalLink } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Flex, Table, type TableProps, Tag, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import type {
	MyAcceptance,
	MyCertificate,
} from "@/repositories/my-documents.repository";
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
}: {
	data?: MyDocumentsData;
	loading?: boolean;
	error?: boolean;
}) {
	const { t } = useTranslate();

	const empty = (text: string) => ({
		emptyText: (
			<Text type="secondary">
				{error ? t("legal.my.error", "Could not load your documents.") : text}
			</Text>
		),
	});

	const acceptanceColumns: TableProps<MyAcceptance>["columns"] = [
		{
			title: t("legal.my.document", "Document"),
			key: "title",
			render: (_, row) => (
				<Flex vertical>
					<Text>{row.title}</Text>
					{row.subject && <Text type="secondary">{row.subject}</Text>}
				</Flex>
			),
		},
		{
			title: t("legal.my.version", "Version"),
			dataIndex: "version",
			render: (v: number) => `v${v}`,
		},
		{
			title: t("legal.my.accepted", "Accepted"),
			dataIndex: "acceptedAt",
			render: day,
		},
		{
			key: "open",
			align: "right",
			render: (_, row) =>
				row.href && (
					<Link href={row.href} target="_blank" className={styles.action}>
						{t("legal.my.open", "Open")} <IconExternalLink size={14} />
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
			render: day,
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
					{t("legal.my.verify", "Verify")} <IconExternalLink size={14} />
				</Link>
			),
		},
	];

	return (
		<Flex vertical gap={32}>
			<section>
				<Title level={4}>
					{t("legal.my.accepted-title", "Accepted documents")}
				</Title>
				<Table
					rowKey="id"
					className={styles.table}
					columns={acceptanceColumns}
					dataSource={error ? [] : data?.acceptances}
					loading={loading}
					pagination={false}
					locale={empty(
						t("legal.my.no-acceptances", "No accepted documents yet."),
					)}
					scroll={{ x: "max-content" }}
				/>
			</section>
			<section>
				<Title level={4}>
					{t("legal.my.certificates-title", "Certificates")}
				</Title>
				<Table
					rowKey="id"
					className={styles.table}
					columns={certificateColumns}
					dataSource={error ? [] : data?.certificates}
					loading={loading}
					pagination={false}
					locale={empty(t("legal.my.no-certificates", "No certificates yet."))}
					scroll={{ x: "max-content" }}
				/>
			</section>
		</Flex>
	);
}

export function MyDocuments() {
	const { data, isLoading, isError } = useQuery({
		queryKey: ["my-legal-documents"],
		queryFn: () =>
			axios
				.get<MyDocumentsData>("/api/user/legal/documents")
				.then((r) => r.data),
	});
	return <MyDocumentsView data={data} loading={isLoading} error={isError} />;
}
