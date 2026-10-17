"use client";

import { IconDownload, IconSearch } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import {
	Button,
	DatePicker,
	Input,
	Row,
	Select,
	Space,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import dayjs, { type Dayjs } from "dayjs";
import debounce from "lodash/debounce";
import { useMemo, useState } from "react";
import ModernTable from "@/components/ModernTable";
import { AdminSpace } from "@/components/spaces/AdminSpace";
import {
	LEGAL_CODES,
	LEGAL_CONTEXTS,
	LEGAL_DOCUMENTS,
	type LegalCode,
} from "@/config/legal/registry";
import type { AcceptanceRow } from "@/repositories/legal-acceptances.repository";
import styles from "./style.module.scss";

const { Text, Title } = Typography;

type Filters = {
	search?: string;
	code?: LegalCode;
	version?: number;
	context?: string;
	range?: [Dayjs, Dayjs] | null;
};

const toParams = (filters: Filters, page?: number) => {
	const params = new URLSearchParams();
	if (filters.search) params.set("search", filters.search);
	if (filters.code) params.set("code", filters.code);
	if (filters.version) params.set("version", String(filters.version));
	if (filters.context) params.set("context", filters.context);
	if (filters.range) {
		params.set("from", filters.range[0].startOf("day").toISOString());
		params.set("to", filters.range[1].endOf("day").toISOString());
	}
	if (page) params.set("page", String(page));
	return params;
};

const columns: ColumnsType<AcceptanceRow> = [
	{
		title: "User",
		key: "user",
		render: (_, r) => (
			<Space direction="vertical" size={0}>
				<Text>{r.user.name ?? "—"}</Text>
				<Text type="secondary">{r.user.email}</Text>
			</Space>
		),
	},
	{ title: "Document", dataIndex: "title" },
	{ title: "Version", dataIndex: "version", render: (v: number) => `v${v}` },
	{ title: "Context", dataIndex: "context" },
	{
		title: "Checkpoint / Project",
		dataIndex: "subject",
		render: (v: string | null) => v ?? "—",
	},
	{
		title: "Accepted (UTC)",
		dataIndex: "acceptedAt",
		render: (v: string) => dayjs(v).utc().format("YYYY-MM-DD HH:mm:ss"),
	},
	{
		title: "IP",
		dataIndex: "ipAddress",
		render: (v: string | null) => v ?? "—",
	},
	{
		title: "User agent",
		dataIndex: "userAgent",
		ellipsis: true,
		width: 220,
		render: (v: string | null) => v ?? "—",
	},
	{
		title: "Checksum",
		dataIndex: "checksum",
		render: (v: string) => (
			<Text copyable={{ text: v }} code>
				{v.slice(0, 10)}…
			</Text>
		),
	},
];

export default function AdminLegalPage() {
	const [filters, setFilters] = useState<Filters>({});
	const [searchInput, setSearchInput] = useState("");
	const [page, setPage] = useState(1);

	const applySearch = useMemo(
		() =>
			debounce((search: string) => {
				setPage(1);
				setFilters((f) => ({ ...f, search: search.trim() || undefined }));
			}, 300),
		[],
	);

	const set = (patch: Partial<Filters>) => {
		setPage(1);
		setFilters((f) => ({ ...f, ...patch }));
	};

	const { data, isLoading, isError } = useQuery({
		queryKey: ["admin-legal-acceptances", filters, page],
		queryFn: () =>
			axios
				.get<{ total: number; rows: AcceptanceRow[] }>(
					`/api/admin/legal/acceptances?${toParams(filters, page)}`,
				)
				.then((r) => r.data),
	});

	const versions = filters.code
		? LEGAL_DOCUMENTS[filters.code].versions.map((v) => ({
				value: v.version,
				label: `v${v.version}`,
			}))
		: [];

	return (
		<AdminSpace>
			<Row justify="space-between" align="middle" wrap>
				<Title level={2} className={styles.pageTitle}>
					Legal acceptances
				</Title>
				<Button
					icon={<IconDownload size={16} />}
					href={`/api/admin/legal/acceptances?${toParams(filters)}&format=csv`}
				>
					Export CSV
				</Button>
			</Row>
			<Space size={12} wrap className={styles.filters}>
				<Input
					allowClear
					variant="filled"
					prefix={<IconSearch size={16} />}
					placeholder="Search by user"
					className={styles.search}
					value={searchInput}
					onChange={(e) => {
						setSearchInput(e.target.value);
						applySearch(e.target.value);
					}}
				/>
				<Select
					allowClear
					placeholder="Document"
					className={styles.select}
					value={filters.code}
					options={LEGAL_CODES.map((code) => ({
						value: code,
						label: LEGAL_DOCUMENTS[code].title,
					}))}
					onChange={(code?: LegalCode) => set({ code, version: undefined })}
				/>
				<Select
					allowClear
					placeholder="Version"
					disabled={!filters.code}
					value={filters.version}
					options={versions}
					onChange={(version?: number) => set({ version })}
				/>
				<Select
					allowClear
					placeholder="Context"
					className={styles.select}
					value={filters.context}
					options={LEGAL_CONTEXTS.map((c) => ({ value: c, label: c }))}
					onChange={(context?: string) => set({ context })}
				/>
				<DatePicker.RangePicker
					value={filters.range ?? null}
					onChange={(range) => set({ range: range as [Dayjs, Dayjs] | null })}
				/>
			</Space>
			<ModernTable<AcceptanceRow>
				rowKey="id"
				columns={columns}
				dataSource={isError ? [] : data?.rows}
				loading={isLoading}
				scroll={{ x: "max-content" }}
				emptyState={{
					description: isError
						? "Could not load the acceptances."
						: "No acceptances match these filters.",
				}}
				pagination={{
					current: page,
					pageSize: 20,
					total: data?.total ?? 0,
					showSizeChanger: false,
					onChange: setPage,
				}}
			/>
		</AdminSpace>
	);
}
