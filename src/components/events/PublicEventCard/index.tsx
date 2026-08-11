"use client";

import { useTranslate } from "@tolgee/react";
import { Button, Flex } from "antd";
import Link from "next/link";
import { StatusDot } from "@/components/ui";
import { formatEventPeriod } from "@/helpers/format";
import {
	type EventCardSchedule,
	EventCover,
	useEventCover,
	useEventTypeLabel,
} from "../EventCardParts";
import styles from "./style.module.scss";

export type PublicEvent = {
	id: string;
	slug?: string | null;
	title: string;
	shortDescription?: string | null;
	type?: string | null;
	lang?: string | null;
	image?: string | null;
	schedule?: EventCardSchedule | null;
};

/**
 * Whether the event is still ahead.
 *
 * The design labels this slot "Registration open / Few seats left / Sold out",
 * but an event has no capacity in the schema — there are no seats to count. So
 * the card says the one thing it can know for certain, and stays quiet rather
 * than inventing scarcity.
 */
function useAttendance(isFinished: boolean) {
	const { t } = useTranslate();

	return isFinished
		? { tone: "neutral" as const, label: t("event.state.finished", "Finished") }
		: {
				tone: "success" as const,
				label: t("event.state.open", "Registration open"),
			};
}

/** One event in the public catalogue. */
export function PublicEventCard({
	event,
	isFinished = false,
}: {
	event: PublicEvent;
	isFinished?: boolean;
}) {
	const { t } = useTranslate();
	const typeLabel = useEventTypeLabel();
	const { first, last, tint, when } = useEventCover(event);
	const attendance = useAttendance(isFinished);

	const kind = typeLabel(event.type);
	const href = `/event/${event.slug}`;

	return (
		<article className={styles.card}>
			<Link href={href} className={styles.coverLink}>
				<EventCover
					image={event.image}
					tint={tint}
					// An event that is over keeps its cover but drops the chips: the
					// date and the kind are already in the text below, and on a
					// greyed-out card they only compete with the ones still to come.
					when={isFinished ? null : when}
					kind={isFinished ? "" : kind}
					type={event.type}
					muted={isFinished}
				/>
			</Link>

			<div className={styles.main}>
				<div className={styles.body}>
					<span className={styles.place}>{kind}</span>
					<Link href={href} className={styles.titleLink}>
						<h3 className={styles.title}>{event.title}</h3>
					</Link>
					<span className={styles.meta}>
						{first
							? formatEventPeriod(
									first.startDate,
									last.endDate,
									event.lang ?? "en",
									"day",
								)
							: (event.shortDescription ?? "")}
					</span>
				</div>

				<Flex
					align="center"
					justify="space-between"
					gap={8}
					className={styles.foot}
				>
					<StatusDot tone={attendance.tone} label={attendance.label} />
					<Link href={href}>
						<Button type="primary" size="small">
							{t("event.details", "Details")}
						</Button>
					</Link>
				</Flex>
			</div>
		</article>
	);
}

export default PublicEventCard;
