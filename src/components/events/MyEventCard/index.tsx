"use client";

import { IconDotsVertical } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Dropdown, Flex, type MenuProps } from "antd";
import type { ReactNode } from "react";
import { formatEventPeriod } from "@/helpers/format";
import {
	EventCover,
	EventStatusDot,
	useEventCover,
	useEventTypeLabel,
} from "../EventCardParts";
import styles from "./style.module.scss";

export type MyEventCardEvent = {
	id: string;
	title?: string | null;
	type?: string | null;
	lang?: string | null;
	slug?: string | null;
	image?: string | null;
	status?: string | null;
	schedule?: Array<{
		startDate: string | Date;
		endDate: string | Date;
		directionId?: string | null;
	}> | null;
};

/**
 * One of the organiser's own events.
 *
 * The cover carries the craft's colour rather than a house grey: the tint is the
 * direction of the event's first session, the same palette the schedule timeline
 * draws its bars from, so a person recognises their own event by colour before
 * reading a word of it. An uploaded cover image replaces the tint and the chips
 * stay on top of it.
 */
export function MyEventCard({
	event,
	menu,
	views,
	showLang = false,
	className,
	onMouseEnter,
	onMouseLeave,
	...rest
}: {
	event: MyEventCardEvent;
	menu: MenuProps["items"];
	/** Rendered after the dates; the counter loads on its own. */
	views?: ReactNode;
	/**
	 * Only when the event has other locale versions. On a single-language event
	 * the code says nothing — every card would carry the same `en`.
	 */
	showLang?: boolean;
	className?: string;
	onMouseEnter?: () => void;
	onMouseLeave?: () => void;
}) {
	const { t } = useTranslate();
	const typeLabel = useEventTypeLabel();

	// Cover, tint and date chip come from the shared parts — this card drew its
	// own copy of them, which is how it missed the per-type aspect ratios.
	const { first, last, tint, when } = useEventCover(event);
	const kind = typeLabel(event.type);

	return (
		<article
			className={`${styles.card}${className ? ` ${className}` : ""}`}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			{...rest}
		>
			<EventCover
				image={event.image}
				tint={tint}
				when={when}
				kind={kind}
				type={event.type}
			/>

			<div className={styles.body}>
				<span className={styles.place}>
					{[showLang ? event.lang : null, kind].filter(Boolean).join(" · ")}
				</span>
				<h3 className={styles.title}>
					{event.title || t("event.untitled", "Untitled event")}
				</h3>
				{first ? (
					<span className={styles.meta}>
						{formatEventPeriod(
							first.startDate,
							last.endDate,
							event.lang ?? "en",
						)}
						{views}
					</span>
				) : (
					// The one thing that stops an event from being published, said where
					// the dates would have been rather than in a banner over the card.
					<span className={`${styles.meta} ${styles.warning}`}>
						{t("event.noDates", "You need to set a schedule")}
					</span>
				)}
			</div>

			<Flex
				align="center"
				justify="space-between"
				gap={8}
				className={styles.foot}
			>
				<EventStatusDot status={event.status} />
				<Flex align="center" gap={6}>
					<Button type="primary" size="small" href={`/user/event/${event.id}`}>
						{t("event.manage", "Manage")}
					</Button>
					<Dropdown menu={{ items: menu }} trigger={["click"]}>
						<Button size="small" icon={<IconDotsVertical size={15} />} />
					</Dropdown>
				</Flex>
			</Flex>
		</article>
	);
}

export default MyEventCard;
