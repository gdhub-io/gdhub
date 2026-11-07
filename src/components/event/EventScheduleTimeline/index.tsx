"use client";

import { IconDots, IconPencil, IconTrash } from "@tabler/icons-react";
import { useTolgee } from "@tolgee/react";
import { Avatar, Button, Dropdown, Flex, Segmented, Skeleton } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { getWorkDirection } from "@/components/DirectionBadge/directions";
import { LoadError } from "@/components/ui";
import { formatEventPeriod } from "@/helpers/format";
import { useWorkDirections } from "@/hooks/library";
import { SpeakerAvatars } from "../SpeakerAvatars";
import styles from "./style.module.scss";

const MAX_VISIBLE_SPEAKERS = 3;
const SKELETON_ITEMS = [0, 1, 2];

export type TimelineSpeaker = {
	id?: string;
	name?: string | null;
	user?: { image?: string | null; profile?: { name?: string | null } | null };
};

export type TimelineItem = {
	id?: string | null;
	title?: string | null;
	directionId?: string | null;
	startDate: string | Date;
	endDate: string | Date;
	speakers?: TimelineSpeaker[];
};

type Scale = "hours" | "days";

/** The columns the ruler is drawn from. */
function buildTicks(items: TimelineItem[], scale: Scale) {
	const unit: dayjs.OpUnitType = scale === "hours" ? "hour" : "day";
	if (!items.length) return { ticks: [] as dayjs.Dayjs[], unit };

	const from = items
		.reduce(
			(min, item) =>
				dayjs(item.startDate).isBefore(min) ? dayjs(item.startDate) : min,
			dayjs(items[0].startDate),
		)
		.startOf(unit);
	const to = items
		.reduce(
			(max, item) =>
				dayjs(item.endDate).isAfter(max) ? dayjs(item.endDate) : max,
			dayjs(items[0].endDate),
		)
		.endOf(unit);

	const ticks: dayjs.Dayjs[] = [];
	// Capped, so a draft spanning a year cannot render thousands of columns.
	for (
		let cursor = from;
		cursor.isBefore(to) && ticks.length < 240;
		cursor = cursor.add(1, unit as dayjs.ManipulateType)
	) {
		ticks.push(cursor);
	}

	return { ticks, unit };
}

/**
 * The event's programme as a timeline the organiser can read at a glance.
 *
 * Two panes side by side, each scrolling on its own: the facts on the left —
 * what, who, how long — and the same sessions as bars against the clock on the
 * right. One shared scroller let a long title squeeze the graph into a sliver,
 * which is the half worth looking at.
 */
export function EventScheduleTimeline({
	items,
	onEdit,
	onDelete,
	canEdit,
	loading,
	error,
	onRetry,
}: {
	items: TimelineItem[];
	/** The programme has not arrived yet: rows are drawn as placeholders. */
	loading?: boolean;
	/** The programme failed to load: said so in place of the rows, with `onRetry`. */
	error?: boolean;
	onRetry?: () => void;
	onEdit?: (item: TimelineItem) => void;
	onDelete?: (id: string) => void;
	canEdit?: boolean;
}) {
	const { t, getLanguage } = useTolgee();
	const [scale, setScale] = useState<Scale>("hours");
	const lang = getLanguage() || "en";
	const { data: directions } = useWorkDirections();

	// Craft colour is the palette: a bar is content, so it wears its direction's
	// tint rather than one house colour for everything.
	const directionOf = useMemo(() => {
		const byId = new Map((directions ?? []).map((d) => [d.id, d.name]));
		return (id?: string | null) => {
			const name = id ? byId.get(id) : undefined;
			return name ? getWorkDirection(name).slug : null;
		};
	}, [directions]);

	const sorted = useMemo(
		() =>
			[...items].sort(
				(left, right) =>
					dayjs(left.startDate).valueOf() - dayjs(right.startDate).valueOf(),
			),
		[items],
	);

	const { ticks, unit } = useMemo(
		() => buildTicks(sorted, scale),
		[sorted, scale],
	);
	const columns = `repeat(${Math.max(ticks.length, 1)}, minmax(64px, 1fr))`;

	return (
		<div className={styles.panel}>
			<Flex
				align="center"
				justify="space-between"
				gap={8}
				wrap
				className={styles.toolbar}
			>
				<Segmented
					size="small"
					value={scale}
					onChange={(value) => setScale(value as Scale)}
					options={[
						{ label: t("event.schedule.scale.hours", "Hours"), value: "hours" },
						{ label: t("event.schedule.scale.days", "Days"), value: "days" },
					]}
				/>
				{sorted.length > 0 && (
					<span className={styles.range}>
						{formatEventPeriod(
							sorted[0].startDate,
							sorted[sorted.length - 1].endDate,
							lang,
							"day",
						)}
					</span>
				)}
			</Flex>

			{error ? (
				<LoadError
					title={t(
						"event.timeline.load-error",
						"The schedule could not be loaded",
					)}
					onRetry={onRetry}
				/>
			) : loading ? (
				<Flex align="stretch" aria-busy>
					<div className={styles.labelPane}>
						<div className={`${styles.head} ${styles.headRow}`} />
						{SKELETON_ITEMS.map((index) => (
							<Flex key={index} align="center" className={styles.row}>
								<Flex vertical className={styles.colItem}>
									<Skeleton.Input active size="small" />
								</Flex>
								<Flex align="center" className={styles.colSpeakers}>
									<Skeleton.Avatar active size={24} />
								</Flex>
							</Flex>
						))}
					</div>
					<div className={styles.trackPane}>
						<div className={`${styles.head} ${styles.headRow}`} />
						{SKELETON_ITEMS.map((index) => (
							<Flex
								key={index}
								align="center"
								className={styles.row}
								style={{ paddingInline: "var(--gd-space-3)" }}
							>
								<Skeleton.Button active size="small" block />
							</Flex>
						))}
					</div>
				</Flex>
			) : !sorted.length ? (
				<div className={styles.empty}>
					{t("event.schedule.empty.admin", "No items yet. Add the first one.")}
				</div>
			) : (
				<Flex align="stretch">
					{/* Left pane: the facts, scrolling on its own. */}
					<div className={styles.labelPane}>
						<div className={styles.paneInner}>
							<Flex
								align="center"
								className={`${styles.head} ${styles.headRow}`}
							>
								<span className={`${styles.colItem} ${styles.headCell}`}>
									{t("event.schedule.column.item", "Item")}
								</span>
								<span className={`${styles.colSpeakers} ${styles.headCell}`}>
									{t("event.schedule.column.speakers", "Speakers")}
								</span>
								<span className={`${styles.colHours} ${styles.headCell}`}>
									{t("event.schedule.column.hours", "Hours")}
								</span>
								<span className={styles.colAction} />
							</Flex>

							{sorted.map((item, index) => {
								const start = dayjs(item.startDate);
								const end = dayjs(item.endDate);
								const speakers = item.speakers ?? [];

								return (
									<Flex
										key={item.id || index}
										align="center"
										className={styles.row}
									>
										<Flex vertical className={styles.colItem}>
											<span className={styles.title}>
												{item.title ||
													t("event.schedule.item.title", "Untitled")}
											</span>
											<span className={styles.subtitle}>
												{start.format("HH:mm")} — {end.format("HH:mm")}
											</span>
										</Flex>

										<Flex align="center" className={styles.colSpeakers}>
											{speakers.length ? (
												<SpeakerAvatars
													speakers={speakers}
													size={24}
													max={MAX_VISIBLE_SPEAKERS}
												/>
											) : (
												<span className={styles.subtitle}>—</span>
											)}
										</Flex>

										<span className={`${styles.colHours} ${styles.hours}`}>
											{(end.diff(start, "minute") / 60).toFixed(1)}
										</span>

										<Flex
											align="center"
											justify="center"
											className={styles.colAction}
										>
											{canEdit && (
												<Dropdown
													trigger={["click"]}
													menu={{
														items: [
															{
																key: "edit",
																icon: <IconPencil size={15} />,
																label: t("common.edit", "Edit"),
																onClick: () => onEdit?.(item),
															},
															{
																key: "delete",
																icon: <IconTrash size={15} />,
																label: t("common.delete", "Delete"),
																danger: true,
																disabled: !item.id,
																onClick: () => item.id && onDelete?.(item.id),
															},
														],
													}}
												>
													<Button
														type="text"
														size="small"
														icon={<IconDots size={16} />}
													/>
												</Dropdown>
											)}
										</Flex>
									</Flex>
								);
							})}
						</div>
					</div>

					{/* Right pane: the same sessions against the clock. */}
					<div className={styles.trackPane}>
						<div className={styles.paneInner}>
							<div
								className={`${styles.head} ${styles.headRow} ${styles.track}`}
								style={{ gridTemplateColumns: columns }}
							>
								{ticks.map((tick) => (
									<div key={tick.toISOString()} className={styles.tickHead}>
										<span className={styles.tickLabel}>
											{unit === "hour"
												? tick.format("HH:mm")
												: tick.locale(lang).format("D MMM")}
										</span>
									</div>
								))}
							</div>

							{sorted.map((item, index) => {
								const start = dayjs(item.startDate);
								const end = dayjs(item.endDate);

								// Grid lines are 1-based and the end line is exclusive, so a
								// zero-length slot still gets one column to show itself in.
								const first = Math.max(
									ticks.findIndex(
										(tick) => !tick.isBefore(start.startOf(unit)),
									),
									0,
								);
								const last = Math.max(
									ticks.findIndex((tick) => !tick.isBefore(end.startOf(unit))),
									first,
								);
								const slug = directionOf(item.directionId);

								return (
									<div
										key={item.id || index}
										className={`${styles.row} ${styles.track}`}
										style={{ gridTemplateColumns: columns }}
									>
										{ticks.map((tick) => (
											<div key={tick.toISOString()} className={styles.tick} />
										))}
										<button
											type="button"
											className={styles.bar}
											style={{
												gridColumn: `${first + 1} / ${last + 2}`,
												...(slug
													? {
															background: `var(--gd-direction-${slug}-tint)`,
															color: `var(--gd-direction-${slug}-ink)`,
														}
													: null),
											}}
											onClick={() => canEdit && onEdit?.(item)}
										>
											{item.title || t("event.schedule.item.title", "Untitled")}
										</button>
									</div>
								);
							})}
						</div>
					</div>
				</Flex>
			)}
		</div>
	);
}

export default EventScheduleTimeline;
