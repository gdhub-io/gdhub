"use client";

import {
	IconChevronRight,
	IconInfoCircle,
	IconSearch,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Avatar,
	Button,
	Flex,
	Input,
	Popover,
	Select,
	Table,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import type { SortOrder } from "antd/es/table/interface";
import axios from "axios";
import dayjs from "dayjs";
import Image from "next/image";
import type { Key } from "react";
import { useEffect, useMemo, useState } from "react";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
import { SavedSearches } from "@/components/scout/SavedSearches";
import { formatDollar } from "@/helpers/format";
import { toOptions } from "@/helpers/select";
import type { PageMeta } from "@/lib/pagination";
import type { ScoutCabinet } from "@/repositories/scout";
import type { ScoutFacets } from "@/repositories/scout.games";
import type { InvestmentEstimate } from "@/services/investment/estimate";
import styles from "./style.module.scss";

const { Text } = Typography;

type ScoutGame = {
	id: string;
	name: string;
	slug: string;
	coverImage: string | null;
	genre: string | null;
	platform: string | null;
	stage: string | null;
	author: { id: string; name: string | null; image: string | null } | null;
	applauseCount: number;
	reviewCount: number;
	teamSize: number;
	/** What the team says it is looking for, when it has said. */
	investment: string | null;
	/** Money investors have actually put in, totalled inside each currency. */
	raised: { currency: string; amount: number }[];
	devlogCount: number;
	activityScore: number;
	estimatedInvestment: InvestmentEstimate | null;
	lastActivityAt: string;
};

/** Columns the table can order by. `activity` is when it was last touched. */
type SortKey =
	| "activity"
	| "toRelease"
	| "applause"
	| "reviews"
	| "team"
	| "activityScore";

type Sort = { key: SortKey; direction: "asc" | "desc" };

/** Hardest-worked first: what a scout came to the table to find. */
const DEFAULT_SORT: Sort = { key: "activityScore", direction: "desc" };

type ScoutGamesResponse = { data: ScoutGame[]; meta: PageMeta };

type Filters = { platforms: string[]; genres: string[]; stages: string[] };

const EMPTY_FILTERS: Filters = { platforms: [], genres: [], stages: [] };

const PAGE_SIZE = 20;

/** How long the search box waits before it costs a request. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * A span in the units a person thinks in. Past a year, "29 months" is arithmetic
 * the reader has to do; "2y 5m" is the same fact already done.
 */
const duration = (months: number, t: ReturnType<typeof useTranslate>["t"]) => {
	const inMonths = (count: number) =>
		t(
			"scout.games.investment.months",
			"{count, plural, one {# month} other {# months}}",
			{ count },
		);

	if (months < 12) return inMonths(months);

	const years = t(
		"scout.games.investment.years",
		"{count, plural, one {# year} other {# years}}",
		{ count: Math.floor(months / 12) },
	);
	const rest = months % 12;

	return rest ? `${years} ${inMonths(rest)}` : years;
};

/** What the estimate is built from, so a scout can judge whether to trust it. */
function EstimateBreakdown({
	estimate,
	stated,
	raised,
}: {
	estimate: InvestmentEstimate;
	stated: string | null;
	raised: ScoutGame["raised"];
}) {
	const { t } = useTranslate();

	const rows = [
		// First, because it is the number everything below is compared against:
		// what the team itself is asking for, or a dash saying it has not said.
		[t("scout.games.investment.asking", "Team asks for"), stated ?? "—"],
		[
			t("scout.games.investment.burn", "Team costs per month"),
			formatDollar(estimate.monthlyBurn, { fractionDigits: 0 }),
		],
		[
			t("scout.games.investment.progress", "Progress to release"),
			`${estimate.stagesDone}/${estimate.stagesTotal}`,
		],
		[
			t("scout.games.investment.pace", "Pace"),
			t("scout.games.investment.paceValue", "{percent}% of full time", {
				percent: Math.round(estimate.pace * 100),
			}),
		],
		[
			t("scout.games.investment.eta", "Release at this pace"),
			estimate.monthsToRelease === null
				? "—"
				: duration(estimate.monthsToRelease, t),
		],
		[
			t("scout.games.investment.team", "Team"),
			t("scout.games.investment.people", "{count} people", {
				count: estimate.teamSize,
			}),
		],
		[
			t("scout.games.investment.open", "Open positions"),
			String(estimate.openPositions),
		],
		[
			t("scout.games.investment.raised", "Put in so far"),
			raised.length
				? raised
						.map((row) =>
							formatDollar(row.amount, {
								currency: row.currency,
								fractionDigits: 0,
							}),
						)
						.join(" · ")
				: "—",
		],
		[
			t("scout.games.investment.work", "Work put in, estimated"),
			formatDollar(estimate.total, { fractionDigits: 0 }),
		],
	];

	return (
		<Flex vertical gap={8} className={styles.estimate}>
			{rows.map(([label, value]) => (
				<Flex key={label} justify="space-between" gap={24}>
					<Text type="secondary">{label}</Text>
					<Text strong>{value}</Text>
				</Flex>
			))}
			<Text type="secondary" className={styles.estimateNote}>
				{t(
					"scout.games.investment.note",
					"An automatic guess at what finishing this game would take, from the team's skill levels and stated hours, how far the workflow has moved and the roles still open. Includes a contingency reserve and a marketing share. Not a figure the project has quoted.",
				)}
			</Text>
		</Flex>
	);
}

export function ScoutGamesClient() {
	const { t } = useTranslate();
	const [search, setSearch] = useState("");
	const [query, setQuery] = useState("");
	const [filters, setFilters] = useState<Filters | null>(null);
	const [sort, setSort] = useState<Sort>(DEFAULT_SORT);
	const [page, setPage] = useState(1);

	// The typed value and the requested one are separate: every keystroke would
	// otherwise be a full page of the list.
	useEffect(() => {
		const timer = setTimeout(() => {
			setQuery(search);
			setPage(1);
		}, SEARCH_DEBOUNCE_MS);

		return () => clearTimeout(timer);
	}, [search]);

	// "Matched to your focus": the list opens on what the cabinet asked for, and
	// the selects show it, so the scout can widen it without guessing why these
	// projects are here.
	const { data: cabinet } = useQuery<ScoutCabinet>({
		queryKey: ["scout", "cabinet"],
		queryFn: () => axios.get("/api/scout/cabinet").then((res) => res.data),
	});

	// Seeded once, not copied on every cabinet refetch: re-running it would
	// throw away whatever the scout had narrowed to.
	useEffect(() => {
		setFilters((current) =>
			current || !cabinet
				? current
				: {
						platforms: cabinet.platforms,
						genres: cabinet.genres,
						stages: cabinet.stages,
					},
		);
	}, [cabinet]);

	// Filter options are their own resource: they do not vary by page, sort or
	// search, and the Investment Focus form reads the same list.
	const { data: facets } = useQuery<ScoutFacets>({
		queryKey: ["scout", "games", "facets"],
		queryFn: () => axios.get("/api/scout/games/facets").then((res) => res.data),
		staleTime: 5 * 60 * 1000,
	});

	const { data, isFetching } = useQuery({
		// Held until the focus is known, so the list is fetched once with the
		// scout's filters rather than once empty and again with them.
		enabled: filters !== null,
		placeholderData: (previous) => previous,
		queryKey: ["scout", "games", { query, filters, sort, page }],
		queryFn: () =>
			axios
				.get<ScoutGamesResponse>("/api/scout/games", {
					params: {
						search: query || undefined,
						platforms: filters?.platforms.join(",") || undefined,
						genres: filters?.genres.join(",") || undefined,
						stages: filters?.stages.join(",") || undefined,
						sort: sort.key,
						direction: sort.direction,
						page,
						limit: PAGE_SIZE,
					},
				})
				.then((res) => res.data),
	});

	/** antd hands back the column and the order; the API wants both named. */
	const applySort = (sorter: {
		columnKey?: Key;
		field?: unknown;
		order?: SortOrder;
	}) => {
		setPage(1);
		setSort(
			sorter.order
				? {
						key: String(sorter.columnKey) as SortKey,
						direction: sorter.order === "ascend" ? "asc" : "desc",
					}
				: DEFAULT_SORT,
		);
	};

	const orderOf = (key: SortKey): SortOrder =>
		sort.key === key ? (sort.direction === "asc" ? "ascend" : "descend") : null;

	const setFilter = (key: keyof Filters) => (value: string[]) => {
		setFilters((current) => ({ ...(current ?? EMPTY_FILTERS), [key]: value }));
		setPage(1);
	};

	const hasFilters =
		!!search ||
		Object.values(filters ?? EMPTY_FILTERS).some((value) => value.length > 0);

	const columns = useMemo(
		() => [
			{
				title: t("scout.games.column.project", "Project"),
				key: "project",
				// Every column is measured, because a width is only honoured under
				// `table-layout: fixed` — and antd only switches to it once `scroll.x`
				// is set. Left on auto, one long genre line takes the space the other
				// columns needed and squeezes author names to one letter per line.
				width: 340,
				render: (_: unknown, game: ScoutGame) => (
					<Flex align="center" gap={12} className={styles.projectCell}>
						{game.coverImage ? (
							<Image
								className={styles.cover}
								src={game.coverImage}
								alt=""
								width={64}
								height={36}
							/>
						) : (
							<div className={styles.cover} />
						)}
						<Flex vertical className={styles.projectText}>
							<Text strong ellipsis>
								{game.name}
							</Text>
							<Text type="secondary" ellipsis={{ tooltip: game.genre }}>
								{game.genre}
							</Text>
						</Flex>
					</Flex>
				),
			},
			{
				title: t("scout.games.column.author", "Author"),
				key: "author",
				width: 180,
				render: (_: unknown, game: ScoutGame) => (
					<Flex align="center" gap={8} className={styles.authorCell}>
						<Avatar size={24} src={game.author?.image}>
							{game.author?.name?.charAt(0)}
						</Avatar>
						<Text ellipsis={{ tooltip: game.author?.name }}>
							{game.author?.name}
						</Text>
					</Flex>
				),
			},
			{
				title: t("scout.games.column.platform", "Platform"),
				dataIndex: "platform",
				width: 150,
				ellipsis: true,
				render: (platform: string | null) => platform ?? "—",
			},
			{
				title: t("scout.games.column.stage", "Stage"),
				dataIndex: "stage",
				// Step names are free text from the workflow schema and run long —
				// "Preparing a release version" is one of the seeded ones.
				width: 200,
				render: (stage: string | null) => (stage ? <Tag>{stage}</Tag> : "—"),
			},
			{
				// Devlog posts, weighted the way the platform weighs them everywhere
				// else: every post counts, a post from this month counts more.
				title: t("scout.games.column.activity", "Activity"),
				key: "activityScore",
				width: 110,
				align: "center" as const,
				sorter: true,
				sortOrder: orderOf("activityScore"),
				render: (_: unknown, game: ScoutGame) => (
					<Tooltip
						title={t("scout.games.activity.hint", "{count} devlog posts", {
							count: game.devlogCount,
						})}
					>
						<span>{Math.round(game.activityScore)}</span>
					</Tooltip>
				),
			},
			{
				title: t("scout.games.column.applause", "Applause"),
				dataIndex: "applauseCount",
				key: "applause",
				width: 110,
				align: "center" as const,
				sorter: true,
				sortOrder: orderOf("applause"),
			},
			{
				title: t("scout.games.column.reviews", "Reviews"),
				dataIndex: "reviewCount",
				key: "reviews",
				// Wide enough for the label and the sort arrow beside it; at 100 the
				// heading wrapped and set the height of the whole header row.
				width: 125,
				align: "center" as const,
				sorter: true,
				sortOrder: orderOf("reviews"),
			},
			{
				title: t("scout.games.column.team", "Team"),
				dataIndex: "teamSize",
				key: "team",
				width: 90,
				align: "center" as const,
				sorter: true,
				sortOrder: orderOf("team"),
			},
			{
				// What a scout would have to put in to see the game finished — the
				// cheque, rather than the sweat equity already in it. What has gone in
				// so far is in the breakdown, where it cannot be mistaken for capital
				// somebody actually raised.
				title: t("scout.games.column.toRelease", "To release"),
				key: "toRelease",
				width: 150,
				align: "right" as const,
				sorter: true,
				sortOrder: orderOf("toRelease"),
				render: (_: unknown, game: ScoutGame) => {
					if (!game.estimatedInvestment) return "—";

					return (
						<Flex align="center" justify="end" gap={6}>
							<Text type="secondary">
								≈
								{formatDollar(game.estimatedInvestment.remaining, {
									fractionDigits: 0,
								})}
							</Text>
							<Popover
								title={t("scout.games.investment.estimate", "Estimating")}
								content={
									<EstimateBreakdown
										estimate={game.estimatedInvestment}
										stated={game.investment}
										raised={game.raised}
									/>
								}
							>
								<IconInfoCircle size={15} className={styles.info} />
							</Popover>
						</Flex>
					);
				},
			},
			{
				title: t("scout.games.column.lastActivity", "Last activity"),
				dataIndex: "lastActivityAt",
				key: "activity",
				width: 140,
				align: "right" as const,
				sorter: true,
				sortOrder: orderOf("activity"),
				render: (value: string) => dayjs(value).fromNow(),
			},
			{
				key: "open",
				width: 44,
				render: () => <IconChevronRight size={16} />,
			},
		],
		// `orderOf` closes over `sort`; nothing else in a column body varies.
		[t, sort],
	);

	const tableWidth = columns.reduce(
		(total, column) => total + (column.width ?? 0),
		0,
	);

	return (
		<div className="layout-background">
			<ProtectedPageHeader
				title={t("scout.games.title", "Games")}
				subTitle={t(
					"scout.games.subtitle",
					"Early-stage projects matched to your focus",
				)}
			/>

			<Flex gap={8} wrap className={styles.toolbar}>
				<Input
					allowClear
					prefix={<IconSearch size={16} />}
					placeholder={t("scout.games.search", "Search projects…")}
					className={styles.search}
					value={search}
					onChange={(event) => {
						setSearch(event.target.value);
						setPage(1);
					}}
				/>
				<Select
					mode="multiple"
					allowClear
					className={styles.filter}
					placeholder={t("scout.games.filter.platform", "Platform")}
					options={toOptions(facets?.platforms)}
					value={filters?.platforms ?? []}
					onChange={setFilter("platforms")}
				/>
				<Select
					mode="multiple"
					allowClear
					className={styles.filter}
					placeholder={t("scout.games.filter.genre", "Genre")}
					options={toOptions(facets?.genres)}
					value={filters?.genres ?? []}
					onChange={setFilter("genres")}
				/>
				<Select
					mode="multiple"
					allowClear
					className={styles.filter}
					placeholder={t("scout.games.filter.stage", "Stage")}
					options={toOptions(facets?.stages)}
					value={filters?.stages ?? []}
					onChange={setFilter("stages")}
				/>
				{hasFilters && (
					<Button
						type="text"
						onClick={() => {
							setSearch("");
							setFilters(EMPTY_FILTERS);
							setPage(1);
						}}
					>
						{t("scout.games.clear", "Clear")}
					</Button>
				)}

				<SavedSearches
					current={{ ...(filters ?? EMPTY_FILTERS), query: search }}
					onApply={(saved) => {
						setSearch(saved.query ?? "");
						setFilters({
							platforms: saved.platforms,
							genres: saved.genres,
							stages: saved.stages,
						});
						setPage(1);
					}}
				/>
			</Flex>

			<Table
				rowKey="id"
				loading={isFetching}
				columns={columns}
				dataSource={data?.data ?? []}
				pagination={false}
				onChange={(_pagination, _filters, sorter) =>
					applySort(Array.isArray(sorter) ? sorter[0] : sorter)
				}
				// Any `scroll.x` turns on `table-layout: fixed`, which is what makes
				// the widths above binding; narrower than that, the table scrolls
				// instead of crushing its own columns.
				//
				// A number, and not `max-content`: that sizes the table to its
				// longest cell, the surplus goes to the column holding it, and the
				// genre line the width was there to truncate never truncates.
				// Summed from the columns so the two cannot drift apart.
				scroll={{ x: tableWidth }}
			/>

			{data && !data.meta.isLastPage && (
				<Button
					block
					type="text"
					className={styles.loadMore}
					onClick={() => setPage((current) => current + 1)}
				>
					{t("scout.games.loadMore", "Load more")}
				</Button>
			)}
		</div>
	);
}
