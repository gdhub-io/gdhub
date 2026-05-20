"use client";

import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useQuery } from "@tanstack/react-query";
import { Avatar, Popover, Row, Space, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { SortOrder } from "antd/es/table/interface";
import axios from "axios";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import ModernTable from "@/components/ModernTable";
import { AdminLayout } from "@/layouts/AdminLayout";
import styles from "@/pages/admin/users/style.module.scss";

const { Title, Text } = Typography;

type AdminUserRow = {
	id: string;
	image: string | null;
	name: string;
	email: string | null;
	createdAt: string;
	lastModifiedAt: string;
	specializations: string[];
	skillCapital: {
		scTotal: number;
		leadershipCapital: number;
		executionCapital: number;
		mentorshipCapital: number;
	};
};

type AdminUsersResponse = {
	data: AdminUserRow[];
	meta: {
		currentPage: number;
		pageCount?: number;
		totalCount?: number;
	};
};

type SortField =
	| "createdAt"
	| "name"
	| "scTotal"
	| "leadershipCapital"
	| "executionCapital"
	| "mentorshipCapital";

const isSortField = (value?: string): value is SortField =>
	[
		"createdAt",
		"name",
		"scTotal",
		"leadershipCapital",
		"executionCapital",
		"mentorshipCapital",
	].includes(value || "");

export default function UsersAdminPage() {
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [sortField, setSortField] = useState<SortField | undefined>(
		"createdAt",
	);
	const [sortOrder, setSortOrder] = useState<SortOrder>("descend");

	const { data: response, isFetching } = useQuery({
		queryKey: ["admin", "users", page, pageSize, sortField, sortOrder],
		queryFn: () =>
			axios
				.get<AdminUsersResponse>("/api/admin/users", {
					params: {
						page,
						limit: pageSize,
						sortField,
						sortOrder: sortOrder || undefined,
					},
				})
				.then((r) => r.data),
		refetchOnWindowFocus: false,
	});

	const columns: ColumnsType<AdminUserRow> = useMemo(
		() => [
			{
				title: "Фото",
				dataIndex: "image",
				key: "image",
				width: 70,
				render: (value, record) => (
					<Avatar src={value || undefined}>
						{!value && record.name ? record.name[0] : null}
					</Avatar>
				),
			},
			{
				title: "Имя",
				dataIndex: "name",
				key: "name" as SortField,
				sorter: true,
				sortOrder: sortField === "name" ? sortOrder : null,
				render: (value, record) => (
					<Space direction="vertical" size={0}>
						<Text strong>{value}</Text>
						<Text type="secondary">{record.email || "-"}</Text>
					</Space>
				),
			},
			{
				title: "Специализации",
				dataIndex: "specializations",
				key: "specializations",
				render: (specializations: string[]) =>
					specializations.length ? (
						<Space size={[4, 4]} wrap>
							{specializations.map((specialization) => (
								<Tag key={specialization}>{specialization}</Tag>
							))}
						</Space>
					) : (
						<Text type="secondary">—</Text>
					),
			},
			{
				title: "SC Total",
				dataIndex: ["skillCapital", "scTotal"],
				key: "scTotal" as SortField,
				sorter: true,
				sortOrder: sortField === "scTotal" ? sortOrder : null,
			},
			{
				title: "Leadership",
				dataIndex: ["skillCapital", "leadershipCapital"],
				key: "leadershipCapital" as SortField,
				sorter: true,
				sortOrder: sortField === "leadershipCapital" ? sortOrder : null,
			},
			{
				title: "Execution",
				dataIndex: ["skillCapital", "executionCapital"],
				key: "executionCapital" as SortField,
				sorter: true,
				sortOrder: sortField === "executionCapital" ? sortOrder : null,
			},
			{
				title: "Mentorship",
				dataIndex: ["skillCapital", "mentorshipCapital"],
				key: "mentorshipCapital" as SortField,
				sorter: true,
				sortOrder: sortField === "mentorshipCapital" ? sortOrder : null,
			},
			{
				title: "Created",
				key: "createdAt" as SortField,
				width: 120,
				align: "right",
				sorter: true,
				sortOrder: sortField === "createdAt" ? sortOrder : null,
				render: (_, record) => (
					<Popover content={dayjs(record.createdAt).format("LLL")}>
						<Text>{dayjs(record.createdAt).fromNow()}</Text>
					</Popover>
				),
			},
			{
				title: "Last Modified",
				key: "lastModifiedAt",
				width: 120,
				align: "right",
				render: (_, record) => (
					<Popover content={dayjs(record.lastModifiedAt).format("LLL")}>
						<Text type="secondary">
							{dayjs(record.lastModifiedAt).fromNow()}
						</Text>
					</Popover>
				),
			},
		],
		[sortField, sortOrder],
	);

	return (
		<AdminLayout>
			<div className={styles.main}>
				<Row justify="space-between" align="middle">
					<Title level={2}>Users</Title>
				</Row>
				<ModernTable
					loading={isFetching}
					rowKey="id"
					dataSource={response?.data || []}
					columns={columns}
					onChange={(pagination, _filters, sorter) => {
						const sortState = Array.isArray(sorter) ? sorter[0] : sorter;
						const nextOrder = sortState?.order || null;
						const nextColumnKey =
							typeof sortState?.columnKey === "string"
								? sortState.columnKey
								: undefined;

						if (!nextOrder || !isSortField(nextColumnKey)) {
							setSortField(undefined);
							setSortOrder(null);
						} else {
							setSortField(nextColumnKey);
							setSortOrder(nextOrder);
						}

						setPage(pagination.current || 1);
					}}
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
