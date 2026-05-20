"use client";

import { useQuery } from "@tanstack/react-query";
import { Popover, Row, Space, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import ModernTable from "@/components/ModernTable";
import { AdminLayout } from "@/layouts/AdminLayout";
import styles from "./style.module.scss";

const { Title, Text } = Typography;

type AuditLogRow = {
	id: string;
	actorUserId: string | null;
	subjectUserId: string | null;
	entity: string;
	entityId: string | null;
	action: string;
	changes: unknown;
	meta: unknown;
	createdAt: string;
};

type AdminAuditLogsResponse = {
	data: AuditLogRow[];
	meta: {
		currentPage: number;
		pageCount: number;
		totalCount: number;
	};
};

const renderJsonPreview = (value: unknown) => {
	if (!value) return <Text type="secondary">-</Text>;

	const serialized = JSON.stringify(value);
	if (!serialized) return <Text type="secondary">-</Text>;

	const preview =
		serialized.length > 120 ? `${serialized.slice(0, 120)}...` : serialized;

	return (
		<Popover
			content={<pre style={{ margin: 0 }}>{serialized}</pre>}
			trigger="hover"
		>
			<Text style={{ fontFamily: "monospace" }}>{preview}</Text>
		</Popover>
	);
};

export default function AuditLogsAdminPage() {
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);

	const { data: response, isFetching } = useQuery({
		queryKey: ["admin", "audit-logs", page, pageSize],
		queryFn: () =>
			axios
				.get<AdminAuditLogsResponse>("/api/admin/audit-logs", {
					params: {
						page,
						limit: pageSize,
					},
				})
				.then((r) => r.data),
		refetchOnWindowFocus: false,
	});

	const columns: ColumnsType<AuditLogRow> = useMemo(
		() => [
			{
				title: "Created",
				key: "createdAt",
				width: 140,
				render: (_, record) => (
					<Popover content={dayjs(record.createdAt).format("LLL")}>
						<Text>{dayjs(record.createdAt).fromNow()}</Text>
					</Popover>
				),
			},
			{
				title: "Action",
				dataIndex: "action",
				key: "action",
				width: 140,
				render: (value) => <Tag>{value}</Tag>,
			},
			{
				title: "Entity",
				key: "entity",
				width: 180,
				render: (_, record) => (
					<Space size={4}>
						<Tag color="blue">{record.entity}</Tag>
						<Text type="secondary" style={{ fontFamily: "monospace" }}>
							{record.entityId || "-"}
						</Text>
					</Space>
				),
			},
			{
				title: "Actor",
				dataIndex: "actorUserId",
				key: "actorUserId",
				width: 220,
				render: (value) => (
					<Text style={{ fontFamily: "monospace" }}>{value || "-"}</Text>
				),
			},
			{
				title: "Subject",
				dataIndex: "subjectUserId",
				key: "subjectUserId",
				width: 220,
				render: (value) => (
					<Text style={{ fontFamily: "monospace" }}>{value || "-"}</Text>
				),
			},
			{
				title: "Changes",
				dataIndex: "changes",
				key: "changes",
				width: 300,
				render: (value) => renderJsonPreview(value),
			},
			{
				title: "Meta",
				dataIndex: "meta",
				key: "meta",
				width: 260,
				render: (value) => renderJsonPreview(value),
			},
		],
		[],
	);

	return (
		<AdminLayout>
			<div className={styles.main}>
				<Row justify="space-between" align="middle">
					<Title level={2}>Audit logs</Title>
				</Row>
				<ModernTable
					loading={isFetching}
					rowKey="id"
					size="small"
					dataSource={response?.data || []}
					columns={columns}
					pagination={{
						current: page,
						pageSize,
						total: response?.meta.totalCount || 0,
						showSizeChanger: true,
						pageSizeOptions: [10, 20, 50, 100],
						onChange: (nextPage, nextPageSize) => {
							setPage(nextPage);
							setPageSize(nextPageSize);
						},
						onShowSizeChange: (nextPage, nextPageSize) => {
							setPage(nextPage);
							setPageSize(nextPageSize);
						},
					}}
				/>
			</div>
		</AdminLayout>
	);
}
