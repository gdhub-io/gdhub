"use client";

import {
	IconChevronDown,
	IconExternalLink,
	IconMapPin,
} from "@tabler/icons-react";
import { useTolgee } from "@tolgee/react";
import { Avatar, Button, Flex, Grid, Tooltip } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { SafeMarkdown } from "@/components/ui/SafeMarkdown";
import { formatScheduleDay, formatSlotTime } from "@/helpers/event";
import { SpeakerAvatars } from "../SpeakerAvatars";
import { SpeakersSheet } from "./SpeakersSheet";
import styles from "./style.module.scss";

const MAX_VISIBLE_SPEAKERS = 4;

export type ScheduleSpeaker = {
	id?: string;
	/** The speciality's name — "Game Artist", not the person's. */
	name?: string | null;
	summary?: string | null;
	specialization?: string | null;
	level?: string | null;
	user?: { image?: string | null; profile?: { name?: string | null } | null };
};

export type ScheduleItem = {
	id?: string;
	title?: string | null;
	description?: string | null;
	url?: string | null;
	startDate: string | Date;
	endDate: string | Date;
	speakers?: ScheduleSpeaker[];
	/** Venue, shown for offline slots. */
	address?: string | null;
};

/** The latest moment anything in the group runs to. */
const lastEndOf = (items: ScheduleItem[]) =>
	items.reduce<string | Date>(
		(latest, item) =>
			dayjs(item.endDate).isAfter(latest) ? item.endDate : latest,
		items[0]?.endDate ?? "",
	);

/** Sessions grouped under the day they start on, in order. */
function groupByDay(items: ScheduleItem[]) {
	const days = new Map<string, ScheduleItem[]>();

	for (const item of [...items].sort(
		(left, right) =>
			dayjs(left.startDate).valueOf() - dayjs(right.startDate).valueOf(),
	)) {
		const key = dayjs(item.startDate).format("YYYY-MM-DD");
		days.set(key, [...(days.get(key) ?? []), item]);
	}

	return [...days.entries()];
}

/**
 * The event's programme.
 *
 * One row per session — when, what, where, who — grouped by day, because a
 * multi-day event is read a day at a time.
 *
 * A day is a real `<details>`: on a phone the days fold so the whole programme
 * fits in a thumb's reach, and from the sidebar breakpoint CSS holds them open,
 * where the space exists and folding would only hide things. One tree either
 * way — swapping components at a breakpoint loses the open state and flashes on
 * hydration.
 *
 * The row shows only faces; who they are is a tap away, so a busy session does
 * not push the next one off the screen.
 */
export function EventSchedule({
	items,
	locale,
}: {
	items: ScheduleItem[];
	locale?: string;
}) {
	const { t } = useTolgee();
	const screens = Grid.useBreakpoint();
	const lang = locale || "en";
	const [openItem, setOpenItem] = useState<ScheduleItem | null>(null);

	if (!items.length) {
		return (
			<div className={styles.empty}>
				{t("event.schedule.empty", "The programme is not published yet.")}
			</div>
		);
	}

	return (
		<>
			{groupByDay(items).map(([day, dayItems], dayIndex) => (
				<details key={day} className={styles.day} open={dayIndex === 0}>
					<summary className={styles.summary}>
						<span className={styles.dayLabel}>
							{formatScheduleDay(day, lastEndOf(dayItems), lang)}
						</span>
						<span className={styles.count}>{dayItems.length}</span>
						<IconChevronDown size={16} className={styles.chevron} />
					</summary>

					{dayItems.map((item, index) => {
						const slot = formatSlotTime(item.startDate, item.endDate, lang);
						const speakers = item.speakers ?? [];

						return (
							<div key={item.id || `${day}-${index}`} className={styles.item}>
								<span className={styles.when}>
									{slot.start}
									<span className={styles.end}>{slot.end}</span>
								</span>

								<div className={styles.body}>
									<span className={styles.title}>
										{item.title || t("event.schedule.item.title", "Untitled")}
									</span>

									{item.description && (
										<div className={styles.description}>
											<SafeMarkdown>{item.description}</SafeMarkdown>
										</div>
									)}

									{item.address && (
										<Flex align="center" gap={6} className={styles.place}>
											<IconMapPin size={13} className={styles.placeIcon} />
											{item.address}
										</Flex>
									)}

									{speakers.length > 0 && (
										<Tooltip
											placement="right"
											// A phone has no hover, so the hint would only ever
											// appear as a flash on the tap that already opened the
											// sheet it describes.
											open={screens.lg ? undefined : false}
											title={t(
												"event.schedule.speakers.tooltip",
												"Click to see the speakers",
											)}
										>
											<button
												type="button"
												className={styles.speakers}
												onClick={() => setOpenItem(item)}
												aria-label={t(
													"event.schedule.speakers.show",
													"Show the speakers",
												)}
											>
												<SpeakerAvatars
													speakers={speakers}
													size={24}
													max={MAX_VISIBLE_SPEAKERS}
												/>
											</button>
										</Tooltip>
									)}
								</div>

								{item.url && (
									<Button
										href={item.url}
										target="_blank"
										type="primary"
										size="small"
										icon={<IconExternalLink size={14} />}
										iconPosition="end"
										className={styles.open}
									>
										{t("event.open", "Open")}
									</Button>
								)}
							</div>
						);
					})}
				</details>
			))}

			<SpeakersSheet
				item={openItem}
				locale={lang}
				onClose={() => setOpenItem(null)}
			/>
		</>
	);
}

export default EventSchedule;
