"use client";

import { IconChevronRight, IconFilter, IconSearch } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import {
	Badge,
	Button,
	DatePicker,
	Input,
	Popover,
	Row,
	Select,
	Space,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import dayjs, { type Dayjs } from "dayjs";
import debounce from "lodash/debounce";
import { useEffect, useMemo, useState } from "react";
import { AuditEntryModal } from "@/components/admin/AuditEntryModal";
import { AuditPerson } from "@/components/admin/AuditPerson";
import ModernTable from "@/components/ModernTable";
import { AdminSpace } from "@/components/spaces/AdminSpace";
import { IconTile } from "@/components/ui";
import { auditActionMeta } from "@/config/audit-actions";
import {
	formatAuditValue,
	type NormalizedChanges,
	normalizeAuditChanges,
} from "@/helpers/audit";
import {
	AUDIT_SOURCES,
	type AuditLogRow,
	type AuditLogsResponse,
} from "@/types/audit";
import styles from "./style.module.scss";

const { Title, Text } = Typography;

/** Chips shown inline before the summary line spills into "+N more". */
const MAX_FIELD_CHIPS = 2;

/** The one-line gloss under the field chips. */
const changeSummary = (changes: NormalizedChanges): string => {
	const [only] = changes.entries;

	if (changes.entries.length === 1 && !only.valueUnknown && "from" in only) {
		return `${formatAuditValue(only.from)} → ${formatAuditValue(only.to)}`;
	}
	if (changes.entries.some((entry) => entry.valueUnknown)) {
		return "values not stored";
	}

	const rest = changes.entries.length - MAX_FIELD_CHIPS;
	if (rest > 0) return `+${rest} more fields`;
	if (changes.count !== undefined) return `${changes.count} rows`;

	return "";
};

const RANGE_PRESETS = [
	{
		label: "Today",
		value: [dayjs().startOf("day"), dayjs().endOf("day")] as [Dayjs, Dayjs],
	},
	{
		// Bounded on both sides: "yesterday" that ran to now would just be "2 days".
		label: "Yesterday",
		value: [
			dayjs().subtract(1, "day").startOf("day"),
			dayjs().subtract(1, "day").endOf("day"),
		] as [Dayjs, Dayjs],
	},
	{
		label: "7 days",
		value: [dayjs().subtract(7, "day"), dayjs()] as [Dayjs, Dayjs],
	},
	{
		label: "30 days",
		value: [dayjs().subtract(30, "day"), dayjs()] as [Dayjs, Dayjs],
	},
	{
		label: "90 days",
		value: [dayjs().subtract(90, "day"), dayjs()] as [Dayjs, Dayjs],
	},
];

export default function AuditLogsAdminPage() {
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [actions, setActions] = useState<string[]>([]);
	const [entities, setEntities] = useState<string[]>([]);
	const [sources, setSources] = useState<string[]>([]);
	const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
	const [selected, setSelected] = useState<AuditLogRow | null>(null);

	const [timezone, setTimezone] = useState("");
	useEffect(() => {
		const offset = dayjs()
			.format("Z")
			.replace(/:00$/, "")
			.replace(/^([+-])0/, "$1");
		setTimezone(`GMT${offset}`);
		setRange([dayjs().startOf("day"), dayjs().endOf("day")]);
	}, []);

	const applySearch = useMemo(
		() =>
			debounce((value: string) => {
				setSearch(value.trim());
				setPage(1);
			}, 350),
		[],
	);

	useEffect(() => applySearch.cancel, [applySearch]);

	const applyFilter = <T,>(apply: (value: T) => void) => {
		return (value: T) => {
			apply(value);
			setPage(1);
		};
	};

	const {
		data: response,
		isFetching,
		isError,
		refetch,
	} = useQuery({
		queryKey: [
			"admin",
			"audit-logs",
			page,
			pageSize,
			search,
			actions,
			entities,
			sources,
			range?.[0]?.toISOString(),
			range?.[1]?.toISOString(),
		],
		queryFn: () =>
			axios
				.get<AuditLogsResponse>("/api/admin/audit-logs", {
					params: {
						page,
						limit: pageSize,
						...(search ? { search } : {}),
						...(actions.length ? { action: actions.join(",") } : {}),
						...(entities.length ? { entity: entities.join(",") } : {}),
						...(sources.length ? { source: sources.join(",") } : {}),
						...(range?.[0] ? { from: range[0].toISOString() } : {}),
						...(range?.[1] ? { to: range[1].toISOString() } : {}),
					},
				})
				.then((r) => r.data),
		enabled: !!timezone,
		// A log of what just happened is the one admin screen where coming back to
		// the tab and seeing yesterday's data is a bug, not a saved request.
		refetchOnWindowFocus: true,
		staleTime: 30_000,
		placeholderData: (previous) => previous,
	});

	const activeFilters =
		(actions.length ? 1 : 0) +
		(entities.length ? 1 : 0) +
		(sources.length ? 1 : 0);

	const resetFilters = () => {
		setActions([]);
		setEntities([]);
		setSources([]);
		setPage(1);
	};

	const actionOptions = useMemo(
		() =>
			(response?.facets.actions ?? []).map((facet) => ({
				value: facet.value,
				label: `${auditActionMeta(facet.value, "OK").label} · ${facet.count}`,
			})),
		[response?.facets.actions],
	);

	const entityOptions = useMemo(
		() =>
			(response?.facets.entities ?? []).map((facet) => ({
				value: facet.value,
				label: `${facet.value} · ${facet.count}`,
			})),
		[response?.facets.entities],
	);

	// Derived once per response, not per render: the search box is controlled
	// state, so every keystroke would otherwise re-parse every visible row.
	const derived = useMemo(
		() =>
			new Map(
				(response?.data ?? []).map((row) => [
					row.id,
					{
						changes: normalizeAuditChanges(row.changes),
						action: auditActionMeta(row.action, row.status),
						date: dayjs(row.createdAt).format("DD MMM YYYY"),
						time: dayjs(row.createdAt).format("HH:mm:ss"),
					},
				]),
			),
		[response?.data],
	);

	const columns: ColumnsType<AuditLogRow> = useMemo(
		() => [
			{
				title: (
					<span className={styles.headWithHint}>
						WHEN{" "}
						{timezone ? (
							<span className={styles.headHint}>{timezone}</span>
						) : null}
					</span>
				),
				key: "createdAt",
				width: 190,
				render: (_, record) => (
					<Space size={6}>
						<Text>{derived.get(record.id)?.date}</Text>
						<Text type="secondary">{derived.get(record.id)?.time}</Text>
					</Space>
				),
			},
			{
				title: "ACTOR",
				key: "actor",
				width: 230,
				render: (_, record) => (
					<AuditPerson
						person={record.actor}
						caption={record.source === "unknown" ? null : record.source}
					/>
				),
			},
			{
				title: (
					<Tooltip title="What kind of write produced this row: a create, an update, a delete, a bulk statement, a super-admin override or a rejected write.">
						<span className={styles.headWithHint}>EVENT</span>
					</Tooltip>
				),
				key: "action",
				width: 190,
				render: (_, record) => {
					const meta = derived.get(record.id)?.action;
					if (!meta) return null;

					return (
						<Space size={10}>
							<IconTile
								icon={meta.icon}
								tint={meta.tint}
								ink={meta.ink}
								size="sm"
							/>
							<Text>{meta.label}</Text>
						</Space>
					);
				},
			},
			{
				title: "TARGET",
				key: "target",
				width: 300,
				render: (_, record) => (
					<Space orientation="vertical" size={0}>
						<Text>{record.entityLabel ?? "—"}</Text>
						<Text type="secondary">{record.entity}</Text>
					</Space>
				),
			},
			{
				title: (
					<Tooltip title="Field names are always recorded. Values are not: personal fields keep only the name, and a dash means nothing was recorded.">
						<span className={styles.headWithHint}>CHANGES</span>
					</Tooltip>
				),
				key: "changes",
				render: (_, record) => {
					const changes = derived.get(record.id);
					if (!changes) return null;

					const { entries, count } = changes.changes;
					if (!entries.length && count === undefined) {
						return <Text type="secondary">—</Text>;
					}

					const summary = changeSummary(changes.changes);

					return (
						<Space orientation="vertical" size={2}>
							{entries.length ? (
								<Space size={[4, 4]} wrap>
									{entries.slice(0, MAX_FIELD_CHIPS).map((entry) => (
										<Tag key={entry.field}>{entry.field}</Tag>
									))}
								</Space>
							) : null}
							{summary ? <Text type="secondary">{summary}</Text> : null}
						</Space>
					);
				},
			},
			{
				// The whole row opens the detail modal; without an affordance nothing
				// on a read-only table says so.
				key: "open",
				width: 48,
				align: "right",
				render: () => (
					<IconChevronRight size={16} className={styles.rowChevron} />
				),
			},
		],
		[timezone, derived],
	);

	return (
		<AdminSpace>
			<div>
				{/* No `gutter`: without `Col` children to absorb its padding, the
				header would end up 16px wider than the table card below it. */}
				<Row justify="space-between" align="middle" wrap>
					<Title level={2} className={styles.pageTitle}>
						Audit log
					</Title>
					<Space size={12} wrap>
						<Input
							allowClear
							variant="filled"
							prefix={<IconSearch size={16} />}
							placeholder="Search by actor or target"
							className={styles.searchInput}
							value={searchInput}
							onChange={(event) => {
								setSearchInput(event.target.value);
								applySearch(event.target.value);
							}}
						/>
						<Popover
							trigger="click"
							placement="bottomRight"
							title={
								<div className={styles.filtersHeader}>
									<Text strong>Filters</Text>
									<Button
										type="link"
										size="small"
										disabled={!activeFilters}
										onClick={resetFilters}
									>
										Reset all
									</Button>
								</div>
							}
							content={
								<div className={styles.filtersPanel}>
									<div className={styles.filtersField}>
										<Text type="secondary">Event type</Text>
										<Select
											mode="multiple"
											allowClear
											variant="filled"
											placeholder="Any event"
											value={actions}
											options={actionOptions}
											onChange={applyFilter(setActions)}
											maxTagCount="responsive"
										/>
									</div>
									<div className={styles.filtersField}>
										<Text type="secondary">Entity</Text>
										<Select
											mode="multiple"
											allowClear
											showSearch
											variant="filled"
											placeholder="Any entity"
											value={entities}
											options={entityOptions}
											onChange={applyFilter(setEntities)}
											maxTagCount="responsive"
										/>
									</div>
									<div className={styles.filtersField}>
										<Text type="secondary">Source</Text>
										<Select
											mode="multiple"
											allowClear
											variant="filled"
											placeholder="Any source"
											value={sources}
											options={AUDIT_SOURCES.map((value) => ({
												value,
												label: value,
											}))}
											onChange={applyFilter(setSources)}
											maxTagCount="responsive"
										/>
									</div>
								</div>
							}
						>
							<Button icon={<IconFilter size={16} />}>
								Filters
								{activeFilters ? (
									<Badge
										count={activeFilters}
										size="small"
										color="var(--gd-color-text)"
									/>
								) : null}
							</Button>
						</Popover>
						<DatePicker.RangePicker
							variant="filled"
							presets={RANGE_PRESETS}
							value={range}
							onChange={applyFilter((value) =>
								setRange(value as [Dayjs, Dayjs] | null),
							)}
						/>
					</Space>
				</Row>
				<ModernTable
					loading={isFetching || !timezone}
					error={isError}
					onRetry={refetch}
					rowKey="id"
					dataSource={response?.data || []}
					columns={columns}
					density="compact"
					rowTone={(record) =>
						record.status === "FAILED" ? "danger" : undefined
					}
					onRow={(record) => ({
						onClick: () => setSelected(record),
						style: { cursor: "pointer" },
					})}
					emptyState={{
						title: "No events match these filters",
						description:
							"Audit entries appear here as soon as someone changes a tracked record.",
					}}
					pagination={{
						current: page,
						pageSize,
						size: "small",
						total: response?.meta.totalCount || 0,
						showSizeChanger: true,
						pageSizeOptions: [10, 20, 50, 100],
						showTotal: (total, [from, to]) =>
							`${from}—${to} of ${total} events`,
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
			<AuditEntryModal entry={selected} onClose={() => setSelected(null)} />
		</AdminSpace>
	);
}
