"use client";

import { useTranslate } from "@tolgee/react";
import { Button, Flex } from "antd";
import Link from "next/link";
import { StatusDot } from "@/components/ui";
import { formatEventPeriod } from "@/helpers/format";
import {
	EventCover,
	useEventCover,
	useEventTypeLabel,
} from "../EventCardParts";
import type { PublicEvent } from "../PublicEventCard";
import styles from "./style.module.scss";

/**
 * The one event the page leads with.
 *
 * Same furniture as a grid card turned on its side: the cover keeps its own
 * column and the text gets room for a real description, because this is the
 * event the catalogue is arguing for.
 */
export function FeaturedEventCard({
	event,
	isFinished = false,
}: {
	event: PublicEvent;
	isFinished?: boolean;
}) {
	const { t } = useTranslate();
	const typeLabel = useEventTypeLabel();
	const { first, last, tint, when } = useEventCover(event);

	const href = `/event/${event.slug}`;
	const period = first
		? formatEventPeriod(
				first.startDate,
				last.endDate,
				event.lang ?? "en",
				"day",
			)
		: null;

	return (
		<article className={styles.card}>
			<Link href={href} className={styles.coverLink}>
				<EventCover
					image={event.image}
					tint={tint}
					when={when}
					kind={typeLabel(event.type)}
					type={event.type}
					className={styles.cover}
				/>
			</Link>

			<Flex vertical justify="space-between" flex={1} className={styles.body}>
				<div>
					{period && <span className={styles.period}>{period}</span>}
					<Link href={href} className={styles.titleLink}>
						<h2 className={styles.title}>{event.title}</h2>
					</Link>
					{event.shortDescription && (
						<p className={styles.description}>{event.shortDescription}</p>
					)}
				</div>

				<Flex align="center" justify="space-between" gap={12} wrap>
					<StatusDot
						tone={isFinished ? "neutral" : "success"}
						label={
							isFinished
								? t("event.state.finished", "Finished")
								: t("event.state.open", "Registration open")
						}
					/>
					<Link href={href}>
						<Button type="primary">
							{t("page.events.featured.cta", "Read more")}
						</Button>
					</Link>
				</Flex>
			</Flex>
		</article>
	);
}

export default FeaturedEventCard;
