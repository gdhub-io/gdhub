"use client";

import {
	IconCalendar,
	IconCheck,
	IconCopy,
	IconDownload,
	IconSearch,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	DatePicker,
	Flex,
	Input,
	Row,
	Select,
	Skeleton,
	Tag,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import dayjs, { type Dayjs } from "dayjs";
import debounce from "lodash/debounce";
import { useMemo, useState } from "react";
import { LoadError } from "@/components/legal/LoadError";
import ModernTable from "@/components/ModernTable";
import { AdminSpace } from "@/components/spaces/AdminSpace";
import { StatusDot } from "@/components/ui";
import { AppAvatar } from "@/components/ui/AppAvatar";
import {
	LEGAL_CODES,
	LEGAL_CONTEXTS,
	LEGAL_DOCUMENTS,
	type LegalCode,
	type LegalContext,
} from "@/config/legal/registry";
import type { AcceptanceRow } from "@/repositories/legal/acceptances";
import styles from "./style.module.scss";

const { Text, Title } = Typography;

const CONTEXT_LABELS: Record<LegalContext, string> = {
	SignUp: "Sign-up",
	ProjectCreate: "Project created",
	AdvisorJoin: "Advisor switch-on",
	PaidWork: "Paid work on",
	CheckpointPurchase: "Checkpoint purchase",
	CuratorAccept: "Curator accept",
	ShareChange: "Share change",
	ReAcceptance: "Re-acceptance",
};

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

/** Frames `A18rpy` / `P5Bfq`: every acceptance on record, filterable and exportable. */
export default function AdminLegalPage() {
	const { t } = useTranslate();
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

	const { data, isLoading, isError, refetch } = useQuery({
		queryKey: ["admin-legal-acceptances", filters, page],
		queryFn: () =>
			axios
				.get<{ total: number; rows: AcceptanceRow[] }>(
					`/api/admin/legal/acceptances?${toParams(filters, page)}`,
				)
				.then((r) => r.data),
	});

	const contextLabel = (context: string) =>
		t(
			`admin.legal.context.${context}`,
			CONTEXT_LABELS[context as LegalContext] ?? context,
		);

	const versions = filters.code
		? LEGAL_DOCUMENTS[filters.code].versions.map((v) => ({
				value: v.version,
				label: `v${v.version}`,
			}))
		: [];

	const columns: ColumnsType<AcceptanceRow> = [
		{
			title: t("admin.legal.column.user", "User"),
			key: "user",
			width: 220,
			render: (_, r) => (
				<Flex align="center" gap={8}>
					<AppAvatar size={24} src={r.user.image ?? undefined}>
						{(r.user.name ?? r.user.email ?? "?").slice(0, 1).toUpperCase()}
					</AppAvatar>
					<Flex vertical className={styles.cell}>
						<Text ellipsis>{r.user.name ?? "—"}</Text>
						<Text ellipsis className={styles.sub}>
							{r.user.email}
						</Text>
					</Flex>
				</Flex>
			),
		},
		{
			title: t("admin.legal.column.document", "Document"),
			key: "document",
			width: 180,
			render: (_, r) => (
				<Flex vertical>
					<Text>{r.title}</Text>
					<Text className={styles.sub}>v{r.version}</Text>
				</Flex>
			),
		},
		{
			title: t("admin.legal.column.subject", "Checkpoint / Project"),
			dataIndex: "subject",
			width: 160,
			render: (v: string | null) => v ?? "—",
		},
		{
			title: (
				<>
					{t("admin.legal.column.accepted", "Accepted")}{" "}
					<span className={styles.headNote}>UTC</span>
				</>
			),
			dataIndex: "acceptedAt",
			width: 110,
			render: (v: string) => (
				<Flex vertical>
					<Text className={styles.date}>
						{dayjs(v).utc().format("YYYY-MM-DD")}
					</Text>
					<Text className={styles.sub}>
						{dayjs(v).utc().format("HH:mm:ss")}
					</Text>
				</Flex>
			),
		},
		{
			title: t("admin.legal.column.valid-until", "Valid until"),
			dataIndex: "validUntil",
			width: 120,
			render: (v: string | null) =>
				v ? (
					<Text className={styles.date}>{dayjs(v).format("YYYY-MM-DD")}</Text>
				) : (
					<StatusDot
						tone="success"
						label={t("admin.legal.current", "Current")}
					/>
				),
		},
		{
			title: t("admin.legal.column.ip", "IP"),
			dataIndex: "ipAddress",
			width: 110,
			render: (v: string | null) => v ?? "—",
		},
		{
			title: t("admin.legal.column.user-agent", "User-agent"),
			dataIndex: "userAgent",
			width: 160,
			ellipsis: true,
			render: (v: string | null) => (
				<Text className={styles.agent}>{v ?? "—"}</Text>
			),
		},
		{
			title: t("admin.legal.column.checksum", "Checksum"),
			dataIndex: "checksum",
			width: 150,
			render: (v: string) => (
				<Text
					className={styles.checksum}
					copyable={{
						text: v,
						icon: [
							<IconCopy key="copy" size={16} />,
							<IconCheck key="done" size={16} />,
						],
					}}
				>
					{v.slice(0, 8)}…{v.slice(-4)}
				</Text>
			),
		},
		{
			title: t("admin.legal.column.context", "Context"),
			dataIndex: "context",
			width: 150,
			render: (v: string) => <Tag>{contextLabel(v)}</Tag>,
		},
	];

	const scrollX = columns.reduce((sum, c) => sum + Number(c.width ?? 0), 0);

	return (
		<AdminSpace>
			<Row justify="space-between" align="middle" wrap>
				<Title level={3} className={styles.pageTitle}>
					{t("admin.legal.title", "Legal acceptances")}
				</Title>
				<Button
					icon={<IconDownload size={16} />}
					href={`/api/admin/legal/acceptances?${toParams(filters)}&format=csv`}
				>
					{t("admin.legal.export", "Export CSV")}
				</Button>
			</Row>
			<Flex gap={12} wrap className={styles.filters}>
				<Input
					allowClear
					variant="filled"
					prefix={<IconSearch size={16} />}
					placeholder={t("admin.legal.search", "Search by user name or email")}
					className={styles.search}
					value={searchInput}
					onChange={(e) => {
						setSearchInput(e.target.value);
						applySearch(e.target.value);
					}}
				/>
				<Select
					allowClear
					variant="filled"
					placeholder={t("admin.legal.any-document", "Any document")}
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
					variant="filled"
					placeholder={t("admin.legal.any-version", "Any version")}
					disabled={!filters.code}
					value={filters.version}
					options={versions}
					onChange={(version?: number) => set({ version })}
				/>
				<Select
					allowClear
					variant="filled"
					placeholder={t("admin.legal.any-context", "Any context")}
					className={styles.select}
					value={filters.context}
					options={LEGAL_CONTEXTS.map((c) => ({
						value: c,
						label: contextLabel(c),
					}))}
					onChange={(context?: string) => set({ context })}
				/>
				<DatePicker.RangePicker
					variant="filled"
					prefix={<IconCalendar size={16} />}
					suffixIcon={null}
					value={filters.range ?? null}
					onChange={(range) => set({ range: range as [Dayjs, Dayjs] | null })}
				/>
			</Flex>
			{isError ? (
				<LoadError
					title={t("admin.legal.error", "Acceptances could not be loaded")}
					onRetry={() => refetch()}
				/>
			) : isLoading ? (
				<Skeleton active title={false} paragraph={{ rows: 6 }} />
			) : (
				<ModernTable<AcceptanceRow>
					rowKey="id"
					surface="page"
					columns={columns}
					dataSource={data?.rows}
					scroll={{ x: scrollX }}
					locale={{
						emptyText: (
							<Text className={styles.empty}>
								{t("admin.legal.empty", "No acceptances match these filters.")}
							</Text>
						),
					}}
					pagination={{
						current: page,
						pageSize: 20,
						total: data?.total ?? 0,
						showSizeChanger: false,
						showTotal: (total, [from, to]) =>
							t("admin.legal.total", "{from}–{to} of {total} acceptances", {
								from,
								to,
								total,
							}),
						onChange: setPage,
					}}
				/>
			)}
		</AdminSpace>
	);
}
