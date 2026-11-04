"use client";

import { IconBriefcase, IconSearch } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Flex, Input, Select, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import dayjs from "dayjs";
import debounce from "lodash/debounce";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PositionApplicationsModal } from "@/components/admin/PositionApplicationsModal";
import {
	formatFee,
	LISTING_LABEL,
	LISTING_TONE,
	POSITION_LABEL,
	POSITION_TONE,
} from "@/components/admin/PositionApplicationsModal/copy";
import { getWorkDirection } from "@/components/DirectionBadge";
import ModernTable from "@/components/ModernTable";
import { AdminSpace } from "@/components/spaces/AdminSpace";
import { IconTile, StatusDot } from "@/components/ui";
import type { ListingState, PositionState } from "@/lib/vacancy/listing-state";
import type { AdminPositionRow, AdminPositionsResponse } from "@/types/vacancy";
import styles from "./style.module.scss";

const { Text, Title } = Typography;

const DATE = "D MMM YYYY";

const options = <T extends string>(labels: Record<T, string>, all: string) => [
	{ value: "", label: all },
	...Object.entries<string>(labels).map(([value, label]) => ({ value, label })),
];

/** Frames 10.19 (`M9agGZ`) and 10.19.1: every open position, read-only. */
export default function AdminOpenPositionsPage() {
	const { t } = useTranslate();
	const [search, setSearch] = useState("");
	const [state, setState] = useState<PositionState | "">("");
	const [listing, setListing] = useState<ListingState | "">("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [openId, setOpenId] = useState<string | null>(null);

	const { data, isFetching } = useQuery({
		queryKey: [
			"admin",
			"open-positions",
			search,
			state,
			listing,
			page,
			pageSize,
		],
		queryFn: () =>
			axios
				.get<AdminPositionsResponse>("/api/admin/open-positions", {
					params: {
						search: search || undefined,
						state: state || undefined,
						listing: listing || undefined,
						page,
						pageSize,
					},
				})
				.then((response) => response.data),
		placeholderData: (previous) => previous,
	});

	const onSearch = useMemo(
		() =>
			debounce((value: string) => {
				setSearch(value);
				setPage(1);
			}, 300),
		[],
	);

	const columns: ColumnsType<AdminPositionRow> = [
		{
			title: "Position",
			key: "position",
			width: 300,
			render: (_, row) => (
				<Flex gap={10} align="center" className={styles.min0}>
					<IconTile
						icon={getWorkDirection(row.direction.name)?.icon ?? IconBriefcase}
						direction={row.direction.name}
						size="sm"
					/>
					<Flex vertical className={styles.min0}>
						<Text strong ellipsis={{ tooltip: row.title }}>
							{row.title}
						</Text>
						<Text type="secondary" className={styles.detail}>
							{t(`workDirection-${row.direction.name}`, row.direction.name)}
						</Text>
					</Flex>
				</Flex>
			),
		},
		{
			title: "Project",
			key: "project",
			width: 190,
			render: (_, row) =>
				row.project ? (
					<Link
						href={`/project/${row.project.slug}`}
						onClick={(event) => event.stopPropagation()}
					>
						<Text ellipsis={{ tooltip: row.project.name }}>
							{row.project.name}
						</Text>
					</Link>
				) : (
					<Text type="secondary">—</Text>
				),
		},
		{
			title: "Status",
			key: "state",
			width: 130,
			render: (_, row) => (
				<StatusDot
					tone={POSITION_TONE[row.state]}
					label={POSITION_LABEL[row.state]}
				/>
			),
		},
		{
			title: "Listing",
			key: "listing",
			width: 150,
			render: (_, row) => (
				<StatusDot
					tone={LISTING_TONE[row.listing]}
					label={
						row.listingFee
							? `${LISTING_LABEL.paid} · ${formatFee(row.listingFee)}`
							: LISTING_LABEL[row.listing]
					}
				/>
			),
		},
		{
			title: "Applications",
			key: "applications",
			width: 150,
			align: "right",
			render: (_, row) => (
				<span className={styles.number}>
					<Text strong>{row.applications}</Text>
					{row.applications > 0 && (
						<Text type="secondary"> · {row.openApplications} open</Text>
					)}
				</span>
			),
		},
		{
			title: "Published",
			key: "published",
			width: 120,
			render: (_, row) =>
				row.publishedAt ? (
					<Text type="secondary">{dayjs(row.publishedAt).format(DATE)}</Text>
				) : (
					<Text type="secondary">—</Text>
				),
		},
		{
			title: "Relevant until",
			key: "until",
			width: 130,
			render: (_, row) => (
				<Text type="secondary">{dayjs(row.finishedAt).format(DATE)}</Text>
			),
		},
		{
			title: "Views",
			key: "views",
			width: 90,
			align: "right",
			render: (_, row) => (
				<Text type="secondary" className={styles.number}>
					{row.viewsCount}
				</Text>
			),
		},
	];

	return (
		<AdminSpace>
			<Flex vertical gap={24} className={styles.page}>
				<Flex justify="space-between" align="flex-end" gap={16} wrap>
					<div>
						<Title level={3} className={styles.title}>
							Open positions
						</Title>
						<Text type="secondary">
							Every open position on the platform and who applied
						</Text>
					</div>
					<Flex gap={8} wrap>
						<Input
							allowClear
							variant="filled"
							prefix={<IconSearch size={16} />}
							placeholder="Search a position or project"
							className={styles.search}
							onChange={(event) => onSearch(event.target.value)}
						/>
						<Select
							variant="filled"
							value={state}
							options={options(POSITION_LABEL, "All statuses")}
							onChange={(value) => {
								setState(value);
								setPage(1);
							}}
							className={styles.select}
						/>
						<Select
							variant="filled"
							value={listing}
							options={options(LISTING_LABEL, "All listings")}
							onChange={(value) => {
								setListing(value);
								setPage(1);
							}}
							className={styles.select}
						/>
					</Flex>
				</Flex>
				<ModernTable
					loading={isFetching}
					rowKey="id"
					dataSource={data?.rows ?? []}
					columns={columns}
					scroll={{ x: 1260 }}
					onRow={(row) => ({
						onClick: () => setOpenId(row.id),
						style: { cursor: "pointer" },
					})}
					locale={{
						emptyText: (
							<Text type="secondary">
								No open positions match these filters.
							</Text>
						),
					}}
					pagination={{
						current: page,
						pageSize,
						size: "small",
						total: data?.total ?? 0,
						showSizeChanger: true,
						showTotal: (total, [from, to]) =>
							`${from}—${to} of ${total} open positions`,
						onChange: (nextPage, nextPageSize) => {
							setPage(nextPage);
							setPageSize(nextPageSize);
						},
					}}
				/>
			</Flex>
			<PositionApplicationsModal id={openId} onClose={() => setOpenId(null)} />
		</AdminSpace>
	);
}
