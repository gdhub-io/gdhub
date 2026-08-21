"use client";

import { useTranslate } from "@tolgee/react";
import { Button } from "antd";
import * as d3 from "d3";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SectionHeading } from "@/components/ui";
import { formatCount } from "@/helpers/format";
import type { ViewReportSubject, ViewsDailyPoint } from "@/types/admin-views";
import styles from "./ViewsDailyChart.module.scss";
import { VIEW_SUBJECTS, viewSubjectMeta } from "./viewSubjects";

const PLOT_HEIGHT = 280;
/** Half the line width, so a series at the very top or bottom is not clipped. */
const PLOT_INSET = 2;
const Y_TICKS = 4;
/** Direct labels stack rather than overlap: the shortest gap that stays legible. */
const LABEL_GAP = 16;

type Scales = {
	x: d3.ScaleLinear<number, number>;
	y: d3.ScaleLinear<number, number>;
};

type ViewsDailyChartProps = {
	daily: ViewsDailyPoint[];
	/** First load: nothing to draw yet, but the chrome is already known. */
	loading?: boolean;
	/** A refetch is in flight — the previous data stays, one step back. */
	dimmed?: boolean;
};

type EndLabel = {
	subject: ViewReportSubject;
	value: number;
	y: number;
};

type CrosshairProps = {
	daily: ViewsDailyPoint[];
	scales: Scales;
	width: number;
	isolated: ViewReportSubject | null;
	/** Plot-local x for a viewport x, off a cached rect rather than a fresh read. */
	toPlotX: (clientX: number) => number;
	/** Re-reads that rect; the pointer entering is the one event that can stale it. */
	onEnter: () => void;
};

/**
 * The scrub layer: the crosshair, the dots on it and the tooltip.
 *
 * Split out because it is the only part of the chart the pointer changes. Left
 * at the root, one crosshair step re-rendered the seven paths, the gridlines and
 * every axis label as well — a hundred and fifty elements that cannot have moved.
 */
function ViewsChartCrosshair({
	daily,
	scales,
	width,
	isolated,
	toPlotX,
	onEnter,
}: CrosshairProps) {
	const { t } = useTranslate();
	const [hover, setHover] = useState<number | null>(null);

	const clampIndex = (index: number) =>
		Math.min(daily.length - 1, Math.max(0, index));

	const onMove = (event: React.MouseEvent<SVGSVGElement>) => {
		if (!daily.length || !width) return;
		setHover(clampIndex(Math.round(scales.x.invert(toPlotX(event.clientX)))));
	};

	// The crosshair is the only way to read an exact value, so it answers the
	// arrow keys too rather than being mouse-only.
	const onKeyDown = (event: React.KeyboardEvent<SVGSVGElement>) => {
		if (!daily.length) return;
		if (event.key === "ArrowRight") setHover(clampIndex((hover ?? -1) + 1));
		else if (event.key === "ArrowLeft")
			setHover(clampIndex((hover ?? daily.length) - 1));
		else if (event.key === "Escape") setHover(null);
		else return;
		event.preventDefault();
	};

	const series = VIEW_SUBJECTS.filter(
		(meta) => !isolated || meta.subject === isolated,
	);
	const hovered = hover === null ? null : daily[hover];
	const tooltipLeft = hover === null ? 0 : scales.x(hover);
	const tooltipFlipped = tooltipLeft > width / 2;

	return (
		<>
			<svg
				className={styles.overlay}
				width="100%"
				height={PLOT_HEIGHT}
				role="img"
				// A figure you scrub: arrow keys move the crosshair, so it has to be
				// reachable without a mouse.
				// biome-ignore lint/a11y/noNoninteractiveTabindex: see above
				tabIndex={0}
				aria-label={t("admin.views.chart.title", "Views by day")}
				onMouseEnter={onEnter}
				onMouseMove={onMove}
				onMouseLeave={() => setHover(null)}
				onKeyDown={onKeyDown}
				onBlur={() => setHover(null)}
			>
				<title>{t("admin.views.chart.title", "Views by day")}</title>
				{hover !== null && hovered && (
					<>
						<line
							className={styles.crosshair}
							x1={scales.x(hover)}
							x2={scales.x(hover)}
							y1={PLOT_INSET}
							y2={PLOT_HEIGHT - PLOT_INSET}
						/>
						{series.map((meta) => (
							<circle
								key={meta.subject}
								className={styles.point}
								cx={scales.x(hover)}
								cy={scales.y(hovered.totals[meta.subject])}
								r={4}
								fill={meta.color}
							/>
						))}
					</>
				)}

				{/* A transparent hit surface: the lines themselves are too thin to aim
				    at, and `fill: none` would not be hit-tested. */}
				{!!width && !!daily.length && (
					<rect
						className={styles.surface}
						x={0}
						y={0}
						width={width}
						height={PLOT_HEIGHT}
					/>
				)}
			</svg>

			{hovered && (
				<div
					className={styles.tooltip}
					style={{
						left: tooltipLeft,
						transform: tooltipFlipped
							? "translateX(calc(-100% - var(--gd-space-3)))"
							: "translateX(var(--gd-space-3))",
					}}
				>
					<p className={styles.tooltipDay}>
						{dayjs(hovered.day).format("D MMM YYYY")}
					</p>
					{series.map((meta) => (
						<p key={meta.subject} className={styles.tooltipRow}>
							<span
								className={styles.mark}
								style={{ background: meta.color }}
							/>
							<span className={styles.tooltipName}>
								{t(meta.labelKey, meta.label)}
							</span>
							<span className={styles.tooltipValue}>
								{formatCount(hovered.totals[meta.subject])}
							</span>
						</p>
					))}
				</div>
			)}
		</>
	);
}

/**
 * Seven lines on one shared scale.
 *
 * Hand-drawn SVG over d3 scales, the way the rest of the platform charts — a
 * charting library for one screen would ship its own idea of colour, type and
 * tooltips, none of which are the system's.
 *
 * Colour lives on the line, on the hover dot and on the 8px square beside a
 * label, and nowhere else: three of the seven series fall below 4.5:1 on this
 * surface, so nothing here sets type in a series colour. That also keeps
 * identity off colour alone, which seven crossing lines cannot afford.
 */
export function ViewsDailyChart({
	daily,
	loading,
	dimmed,
}: ViewsDailyChartProps) {
	const { t } = useTranslate();
	const plotRef = useRef<HTMLDivElement>(null);
	// Read once per hover, not once per pointer move: a `getBoundingClientRect`
	// between two state writes is a forced reflow, sixty times a second.
	const plotLeftRef = useRef(0);
	const [width, setWidth] = useState(0);
	const [isolated, setIsolated] = useState<ViewReportSubject | null>(null);

	const readPlotLeft = useCallback(() => {
		const element = plotRef.current;
		if (element) plotLeftRef.current = element.getBoundingClientRect().left;
	}, []);

	const toPlotX = useCallback(
		(clientX: number) => clientX - plotLeftRef.current,
		[],
	);

	useEffect(() => {
		const element = plotRef.current;
		if (!element) return;

		const observer = new ResizeObserver(([entry]) => {
			setWidth(entry.contentRect.width);
			readPlotLeft();
		});
		observer.observe(element);
		return () => observer.disconnect();
	}, [readPlotLeft]);

	const scales = useMemo<Scales>(() => {
		const max = d3.max(daily, (point) =>
			d3.max(VIEW_SUBJECTS, (meta) => point.totals[meta.subject]),
		);
		const x = d3
			.scaleLinear()
			.domain([0, Math.max(1, daily.length - 1)])
			.range([PLOT_INSET, Math.max(PLOT_INSET, width - PLOT_INSET)]);
		const y = d3
			.scaleLinear()
			.domain([0, Math.max(1, max ?? 0)])
			.nice(Y_TICKS)
			.range([PLOT_HEIGHT - PLOT_INSET, PLOT_INSET]);

		return { x, y };
	}, [daily, width]);

	const lines = useMemo(() => {
		if (!width || !daily.length) return [];

		const path = d3
			.line<number>()
			.x((_, index) => scales.x(index))
			.y((value) => scales.y(value));

		return VIEW_SUBJECTS.map((meta) => ({
			subject: meta.subject,
			color: meta.color,
			d: path(daily.map((point) => point.totals[meta.subject])) ?? "",
		}));
	}, [daily, scales, width]);

	// One label per visible series, pushed apart just enough to stay readable.
	// Order is by position on the plot, which is the only order the reader can
	// check against the lines — it never repaints anything.
	const endLabels = useMemo<EndLabel[]>(() => {
		if (!daily.length) return [];

		const placed = VIEW_SUBJECTS.filter(
			(meta) => !isolated || meta.subject === isolated,
		)
			.map((meta) => {
				const value = daily[daily.length - 1].totals[meta.subject];
				return { subject: meta.subject, value, y: scales.y(value) };
			})
			.sort((a, b) => a.y - b.y);

		for (let index = 1; index < placed.length; index += 1) {
			const gap = placed[index].y - placed[index - 1].y;
			if (gap < LABEL_GAP) placed[index].y = placed[index - 1].y + LABEL_GAP;
		}

		return placed;
	}, [daily, isolated, scales]);

	const yTicks = useMemo(() => scales.y.ticks(Y_TICKS), [scales]);

	// Every other label at the narrowest sensible tick spacing, so a 90-day range
	// does not turn the axis into a smear.
	const xTicks = useMemo(() => {
		const step = Math.max(1, Math.ceil(daily.length / 7));
		return daily
			.map((point, index) => ({ point, index }))
			.filter(({ index }) => index % step === 0 || index === daily.length - 1);
	}, [daily]);

	const visible = (subject: ViewReportSubject) =>
		!isolated || isolated === subject;

	return (
		<section className={styles.panel}>
			<header className={styles.header}>
				<SectionHeading
					level={4}
					title={t("admin.views.chart.title", "Views by day")}
					description={
						isolated
							? t(
									"admin.views.chart.subtitle.isolated",
									"Showing {type} only. Click the chip again, or Show all, to bring the other six back.",
									{
										type: t(
											viewSubjectMeta(isolated).labelKey,
											viewSubjectMeta(isolated).label,
										),
									},
								)
							: t(
									"admin.views.chart.subtitle",
									"All seven types on one scale. Hover a day to compare, click a legend chip to isolate one series.",
								)
					}
				/>
				<span className={styles.unit}>
					{t("admin.views.chart.unit", "views / day")}
				</span>
			</header>

			<div className={styles.body} data-dimmed={dimmed ? "true" : undefined}>
				<div className={styles.legend}>
					{VIEW_SUBJECTS.map((meta) =>
						loading ? (
							<span key={meta.subject} className={styles.legendSkeleton} />
						) : (
							<button
								key={meta.subject}
								type="button"
								className={styles.chip}
								aria-pressed={isolated === meta.subject}
								data-muted={
									isolated && isolated !== meta.subject ? "true" : undefined
								}
								onClick={() =>
									setIsolated((current) =>
										current === meta.subject ? null : meta.subject,
									)
								}
							>
								<span
									className={styles.mark}
									style={{ background: meta.color }}
								/>
								{t(meta.labelKey, meta.label)}
							</button>
						),
					)}
					{isolated && (
						<Button
							type="link"
							size="small"
							className={styles.showAll}
							onClick={() => setIsolated(null)}
						>
							{t("admin.views.chart.showAll", "Show all")}
						</Button>
					)}
				</div>

				<div className={styles.chartBody}>
					<div className={styles.yAxis}>
						{yTicks.map((tick) => (
							<span
								key={tick}
								className={styles.yTick}
								style={{ top: scales.y(tick) }}
							>
								{loading ? (
									<span className={styles.axisSkeleton} />
								) : (
									formatCount(tick)
								)}
							</span>
						))}
					</div>

					<div className={styles.plot} ref={plotRef}>
						<svg
							className={styles.svg}
							width="100%"
							height={PLOT_HEIGHT}
							// The crosshair layer above carries the name and the focus; this
							// one is the picture it draws over.
							aria-hidden="true"
						>
							{yTicks.map((tick) => (
								<line
									key={tick}
									className={tick === 0 ? styles.baseline : styles.gridline}
									x1={0}
									x2={width}
									y1={scales.y(tick)}
									y2={scales.y(tick)}
								/>
							))}

							{lines.map((line) => (
								<path
									key={line.subject}
									className={styles.line}
									d={line.d}
									stroke={line.color}
									data-muted={!visible(line.subject) ? "true" : undefined}
								/>
							))}

							{/* A single day has no segment to draw, so it shows as points. */}
							{daily.length === 1 &&
								VIEW_SUBJECTS.map((meta) => (
									<circle
										key={meta.subject}
										className={styles.point}
										cx={scales.x(0)}
										cy={scales.y(daily[0].totals[meta.subject])}
										r={3}
										fill={meta.color}
										data-muted={!visible(meta.subject) ? "true" : undefined}
									/>
								))}
						</svg>

						<ViewsChartCrosshair
							daily={daily}
							scales={scales}
							width={width}
							isolated={isolated}
							toPlotX={toPlotX}
							onEnter={readPlotLeft}
						/>
					</div>

					<div className={styles.endLabels}>
						{endLabels.map((label) => {
							const meta = viewSubjectMeta(label.subject);
							return (
								<span
									key={label.subject}
									className={styles.endLabel}
									style={{ top: label.y }}
								>
									<span
										className={styles.mark}
										style={{ background: meta.color }}
									/>
									<span className={styles.endLabelName}>
										{t(meta.labelKey, meta.label)}
									</span>
									<span className={styles.endLabelValue}>
										{formatCount(label.value)}
									</span>
								</span>
							);
						})}
					</div>

					<div
						className={styles.xAxis}
						data-loading={loading ? "true" : undefined}
					>
						{loading
							? Array.from({ length: 7 }, (_, index) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: placeholder ticks
									<span key={index} className={styles.axisSkeleton} />
								))
							: xTicks.map(({ point, index }) => (
									<span
										key={point.day}
										className={styles.xTick}
										style={{ left: scales.x(index) }}
									>
										{dayjs(point.day).format("D MMM")}
									</span>
								))}
					</div>
				</div>
			</div>
		</section>
	);
}
