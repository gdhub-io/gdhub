"use client";

import { IconChartLine } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Typography } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import {
	useViewsReport,
	type ViewsRange,
} from "@/components/admin/Views/queries";
import { ViewsDailyChart } from "@/components/admin/Views/ViewsDailyChart";
import { ViewsErrorPanel } from "@/components/admin/Views/ViewsErrorPanel";
import { ViewsKpiCard } from "@/components/admin/Views/ViewsKpiCard";
import {
	ViewsRangePicker,
	viewsRangePreset,
} from "@/components/admin/Views/ViewsRangePicker";
import { ViewsTopTable } from "@/components/admin/Views/ViewsTopTable";
import { VIEW_SUBJECTS } from "@/components/admin/Views/viewSubjects";
import { AdminSpace } from "@/components/spaces/AdminSpace";
import { EmptyState } from "@/components/ui";
import { CONTENT_VIEW_RETENTION_DAYS } from "@/types/content-views";
import styles from "./style.module.scss";

const { Title } = Typography;

/** The window the page opens on: long enough to have a shape, short enough to read. */
const DEFAULT_DAYS = 30;

export default function ViewsAdminPage() {
	const { t } = useTranslate();
	const [range, setRange] = useState<ViewsRange | null>(null);

	// `dayjs()` on the server and on the client are two different instants, so
	// the default range is picked after mount — the same reason the audit log
	// does it there.
	useEffect(() => setRange(viewsRangePreset(DEFAULT_DAYS)), []);

	const { data, isPending, isFetching, isError, errorUpdatedAt, refetch } =
		useViewsReport(range);

	// The server is the one that enforces retention; if it clamped the window,
	// the picker shows what the numbers are actually from. Derived rather than
	// written back into `range`, which would change the query key and refetch a
	// payload already in hand.
	const shown: ViewsRange | null = data?.clamped
		? [dayjs(data.from), dayjs(data.to)]
		: range;

	const loading = isPending || !range;
	const summary = new Map(data?.summary.map((row) => [row.type, row]));
	// The daily series carries a row for every day in the window, zeroes
	// included, so "nothing happened" is a statement about the totals only.
	const isEmpty = !!data && data.summary.every((row) => row.total === 0);

	return (
		<AdminSpace>
			<div className={styles.page}>
				<header className={styles.pageHeader}>
					<div className={styles.titleBlock}>
						<Title level={2} className={styles.pageTitle}>
							{t("admin.views.title", "Views")}
						</Title>
						<p className={styles.subtitle}>
							{t(
								"admin.views.subtitle",
								"What people opened, by content type. Deltas compare with the previous period of equal length.",
							)}
							{data?.timezone ? (
								<span className={styles.timezone}> · {data.timezone}</span>
							) : null}
						</p>
					</div>
					<ViewsRangePicker value={shown} onChange={setRange} />
				</header>

				{isError ? (
					<section className={styles.statePanel}>
						<ViewsErrorPanel onRetry={() => refetch()}>
							<p className={styles.reference}>
								{t(
									"admin.views.error.reference",
									"Reference: {code} · {timestamp}",
									{
										code: "VIEWS_SUMMARY_FAILED",
										timestamp: dayjs(errorUpdatedAt).format(
											"YYYY-MM-DD HH:mm:ss",
										),
									},
								)}
							</p>
						</ViewsErrorPanel>
					</section>
				) : (
					<>
						<div className={styles.kpiRow}>
							{VIEW_SUBJECTS.map((meta) => (
								<ViewsKpiCard
									key={meta.subject}
									subject={meta.subject}
									total={summary.get(meta.subject)?.total ?? 0}
									previousTotal={
										summary.get(meta.subject)?.previousTotal ?? null
									}
									loading={loading}
								/>
							))}
						</div>

						{isEmpty ? (
							<section className={styles.statePanel}>
								<EmptyState
									icon={IconChartLine}
									tint="var(--gd-neutral-100)"
									ink="var(--gd-color-text-secondary)"
									title={t(
										"admin.views.empty.title",
										"Views appear here as people open your content",
									)}
									description={t(
										"admin.views.empty.description",
										"Nobody opened a devlog, post, course, event, expert, vacancy or project page between {from} and {to}. Widen the range or come back tomorrow.",
										{
											from: dayjs(data.from).format("D MMM YYYY"),
											to: dayjs(data.to).format("D MMM YYYY"),
										},
									)}
									action={
										<Button
											type="primary"
											onClick={() =>
												setRange(viewsRangePreset(CONTENT_VIEW_RETENTION_DAYS))
											}
										>
											{t("admin.views.empty.action", "Switch to {days} days", {
												days: CONTENT_VIEW_RETENTION_DAYS,
											})}
										</Button>
									}
								/>
							</section>
						) : (
							<>
								<ViewsDailyChart
									daily={data?.daily ?? []}
									loading={loading}
									dimmed={!loading && isFetching}
								/>
								<ViewsTopTable range={range} />
							</>
						)}
					</>
				)}
			</div>
		</AdminSpace>
	);
}
