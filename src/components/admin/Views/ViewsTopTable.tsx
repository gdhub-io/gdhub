"use client";

import { IconArrowUpRight, IconChartLine } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Segmented, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import { useState } from "react";
import ModernTable from "@/components/ModernTable";
import { SectionHeading } from "@/components/ui";
import { formatCount } from "@/helpers/format";
import {
	VIEWS_TOP_LIMIT,
	type ViewReportSubject,
	type ViewsTopRow,
} from "@/types/admin-views";
import { DASH } from "./format";
import { useViewsTop, type ViewsRange } from "./queries";
import { ViewsErrorPanel } from "./ViewsErrorPanel";
import styles from "./ViewsTopTable.module.scss";
import { VIEW_SUBJECTS, viewSubjectMeta } from "./viewSubjects";

/** rank 64 + content + views 148, so antd binds the widths under `table-layout: fixed`. */
const TABLE_WIDTH = 720;

const skeletonRows = Array.from({ length: VIEWS_TOP_LIMIT }, (_, index) => ({
	id: `skeleton-${index}`,
	title: "",
	subtitle: null,
	href: null,
	views: 0,
})) satisfies ViewsTopRow[];

type ViewsTopTableProps = {
	range: ViewsRange | null;
};

/**
 * Which individual items carried the period, for one type at a time.
 *
 * The type lives here rather than on the page: nothing else on the screen reads
 * it, and the panel is the only thing that has to survive a switch without
 * changing height.
 */
export function ViewsTopTable({ range }: ViewsTopTableProps) {
	const { t } = useTranslate();
	const [subject, setSubject] = useState<ViewReportSubject>(
		VIEW_SUBJECTS[0].subject,
	);
	const { data, isPending, isFetching, isError, refetch } = useViewsTop(
		subject,
		range,
	);

	const meta = viewSubjectMeta(subject);
	const loading = isPending || !range;
	const rows = loading ? skeletonRows : (data?.rows ?? []);

	// A record with no name of its own: the server sends `null` rather than
	// minting English in the data layer.
	const rowTitle = (row: ViewsTopRow) =>
		row.title ?? t("admin.views.top.untitled", "Untitled");

	const columns: ColumnsType<ViewsTopRow> = [
		{
			title: t("admin.views.top.column.rank", "#"),
			key: "rank",
			width: 64,
			render: (_, __, index) =>
				loading ? (
					<span className={styles.skeletonRank} />
				) : (
					<span className={styles.rank}>{index + 1}</span>
				),
		},
		{
			title: t("admin.views.top.column.content", "CONTENT"),
			key: "content",
			render: (_, row) =>
				loading ? (
					<div className={styles.content}>
						<span className={styles.skeletonTitle} />
						<span className={styles.skeletonSubtitle} />
					</div>
				) : (
					<div className={styles.content}>
						{row.href ? (
							<Link className={styles.title} href={row.href}>
								<span className={styles.titleText}>{rowTitle(row)}</span>
								<IconArrowUpRight
									className={styles.titleIcon}
									size={13}
									stroke={2}
								/>
							</Link>
						) : (
							// The page stopped being public between the view and this
							// read: ink text with the reason, not a link into a 404.
							<Tooltip
								title={t(
									"admin.views.top.linkUnavailable",
									"This page is no longer public",
								)}
							>
								<span className={styles.titleDead}>{rowTitle(row)}</span>
							</Tooltip>
						)}
						<span className={styles.subtitle}>{row.subtitle ?? DASH}</span>
					</div>
				),
		},
		{
			title: t("admin.views.top.column.views", "VIEWS"),
			key: "views",
			width: 148,
			align: "right",
			render: (_, row) =>
				loading ? (
					<span className={styles.skeletonViews} />
				) : (
					<span className={styles.views}>{formatCount(row.views)}</span>
				),
		},
	];

	return (
		<section className={styles.panel}>
			<header className={styles.header}>
				<SectionHeading
					level={4}
					title={t("admin.views.top.title", "Top 10 by views")}
					description={t(
						"admin.views.top.subtitle",
						"Most opened items of the selected type, within the selected period.",
					)}
				/>
				<Segmented<ViewReportSubject>
					className={styles.segmented}
					value={subject}
					onChange={setSubject}
					options={VIEW_SUBJECTS.map((option) => ({
						value: option.subject,
						label: t(option.labelKey, option.label),
					}))}
				/>
			</header>

			{isError ? (
				<div className={styles.state}>
					<ViewsErrorPanel onRetry={() => refetch()} />
				</div>
			) : (
				<div
					className={styles.tableWrap}
					data-dimmed={!loading && isFetching ? "true" : undefined}
				>
					<ModernTable<ViewsTopRow>
						className={styles.table}
						rowKey="id"
						dataSource={rows}
						columns={columns}
						density="compact"
						pagination={false}
						scroll={{ x: TABLE_WIDTH }}
						emptyState={{
							icon: IconChartLine,
							title: t(
								"admin.views.top.empty.title",
								"Nothing of this type was opened yet",
							),
							description: t(
								"admin.views.top.empty.description",
								"As soon as someone opens a {type} page, it shows up in this list.",
								{ type: t(meta.labelKey, meta.label).toLowerCase() },
							),
						}}
					/>
				</div>
			)}

			<footer className={styles.footer}>
				{t(
					"admin.views.top.footnote",
					"Every title is a link to the item's public page. Switching type keeps the table at ten rows. A dash means the platform has no value; a zero means it counted none.",
				)}
			</footer>
		</section>
	);
}
