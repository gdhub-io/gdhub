"use client";

import { IconExternalLink, IconMapPin } from "@tabler/icons-react";
import { useTolgee } from "@tolgee/react";
import { Avatar, Button, Flex } from "antd";
import dayjs from "dayjs";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import styles from "./style.module.scss";

const MAX_VISIBLE_SPEAKERS = 4;

export type ScheduleSpeaker = {
	id?: string;
	name?: string | null;
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
	/**
	 * Where the session happens. Offline events need it and the design shows it
	 * on every row, but `EventScheduleItem` has no column for it yet — the row
	 * simply omits the line until the field exists.
	 */
	address?: string | null;
};

const speakerName = (speaker: ScheduleSpeaker) =>
	speaker.user?.profile?.name || speaker.name || "";

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
 * multi-day event is read a day at a time. Both public layouts use it, so a
 * reader who has seen one event's schedule has seen them all.
 */
export function EventSchedule({
	items,
	locale,
}: {
	items: ScheduleItem[];
	locale?: string;
}) {
	const { t } = useTolgee();
	const lang = locale || "en";

	if (!items.length) {
		return (
			<div className={styles.empty}>
				{t("event.schedule.empty", "The programme is not published yet.")}
			</div>
		);
	}

	return (
		<>
			{groupByDay(items).map(([day, dayItems]) => (
				<div key={day}>
					<div className={styles.day}>
						{dayjs(day).locale(lang).format("dddd, D MMMM")}
					</div>

					{dayItems.map((item, index) => {
						const speakers = item.speakers ?? [];
						const visible = speakers.slice(0, MAX_VISIBLE_SPEAKERS);
						const extra = speakers.length - visible.length;

						return (
							<Flex
								key={item.id || `${day}-${index}`}
								gap={16}
								align="flex-start"
								className={styles.item}
							>
								<Flex vertical gap={2} className={styles.time}>
									<span className={styles.start}>
										{dayjs(item.startDate).locale(lang).format("HH:mm")}
									</span>
									<span className={styles.end}>
										{dayjs(item.endDate).locale(lang).format("HH:mm")}
									</span>
								</Flex>

								<Flex vertical gap={6} flex={1}>
									<span className={styles.title}>
										{item.title || t("event.schedule.item.title", "Untitled")}
									</span>

									{item.description && (
										<div className={styles.description}>
											<ReactMarkdown rehypePlugins={[rehypeRaw as never]}>
												{item.description}
											</ReactMarkdown>
										</div>
									)}

									{item.address && (
										<Flex align="center" gap={6} className={styles.place}>
											<IconMapPin size={13} className={styles.placeIcon} />
											{item.address}
										</Flex>
									)}

									{visible.length > 0 && (
										<Flex align="center" className={styles.speakers}>
											{visible.map((speaker, position) => {
												const name = speakerName(speaker);
												return (
													<Avatar
														key={speaker.id || position}
														size={24}
														src={speaker.user?.image || undefined}
														alt={name}
													>
														{name ? name[0] : null}
													</Avatar>
												);
											})}
											{extra > 0 && (
												<span className={styles.extra}>+{extra}</span>
											)}
										</Flex>
									)}
								</Flex>

								{item.url && (
									<Button
										href={item.url}
										target="_blank"
										type="primary"
										size="small"
										icon={<IconExternalLink size={14} />}
										iconPosition="end"
									>
										{t("event.open", "Open")}
									</Button>
								)}
							</Flex>
						);
					})}
				</div>
			))}
		</>
	);
}

export default EventSchedule;
