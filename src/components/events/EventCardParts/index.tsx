"use client";

import { useTranslate } from "@tolgee/react";
import { useMemo } from "react";
import { getWorkDirection } from "@/components/DirectionBadge/directions";
import { StatusDot, type StatusTone } from "@/components/ui";
import { EventStatus } from "@/config/prisma-enums";
import { formatDateChip, isHeadlineEvent } from "@/helpers/event";
import { useWorkDirections } from "@/hooks/library";
import styles from "./style.module.scss";

export type EventCardSchedule = Array<{
	startDate: string | Date;
	endDate: string | Date;
	directionId?: string | null;
}>;

/**
 * The parts every event card shares — the organiser's list, the public
 * catalogue and the featured strip all draw the same cover and the same chips.
 * Only the footer differs between them, so only the footer lives in each card.
 */
export function useEventCover({
	image,
	schedule,
	lang,
}: {
	image?: string | null;
	schedule?: EventCardSchedule | null;
	lang?: string | null;
}) {
	const { data: directions } = useWorkDirections();
	const items = schedule ?? [];
	const first = items[0];
	const last = items[items.length - 1];

	const slug = useMemo(() => {
		const name = first?.directionId
			? directions?.find((row) => row.id === first.directionId)?.name
			: undefined;

		return name ? getWorkDirection(name).slug : null;
	}, [directions, first?.directionId]);

	return {
		first,
		last,
		// The tint stands in for a cover, it does not sit under one.
		tint: image ? null : slug,
		when: first
			? formatDateChip(first.startDate, last.endDate, lang ?? "en")
			: null,
	};
}

export function EventCover({
	image,
	tint,
	when,
	kind,
	type,
	muted = false,
	fit = "height",
	className,
}: {
	image?: string | null;
	tint: string | null;
	when: { day: string; month: string } | null;
	kind: string;
	/**
	 * Decides the shape. Covers are uploaded in two formats — 16:9 for the
	 * events people travel for, 4:5 for the rest (see the crop in EventModal) —
	 * and a card that draws both at one height crops somebody's artwork.
	 */
	type?: string | null;
	/** An event that is over: drained of colour so it sits behind the live ones. */
	muted?: boolean;
	/**
	 * Which dimension is given. `height` is the card default — the cover keeps a
	 * fixed height beside its text and the ratio decides how wide it is. `width`
	 * is for a tile that spans its column, where the ratio decides the height.
	 */
	fit?: "height" | "width";
	className?: string;
}) {
	return (
		<div
			data-format={isHeadlineEvent(type) ? "wide" : "tall"}
			data-fit={fit}
			className={`${styles.cover}${muted ? ` ${styles.muted}` : ""}${className ? ` ${className}` : ""}`}
			style={
				image
					? {
							backgroundImage: `url(${image})`,
							backgroundSize: "cover",
							backgroundPosition: "center",
						}
					: tint
						? { background: `var(--gd-direction-${tint}-tint)` }
						: undefined
			}
		>
			{kind && (
				<span
					className={styles.typeChip}
					style={
						tint ? { color: `var(--gd-direction-${tint}-ink)` } : undefined
					}
				>
					{kind}
				</span>
			)}
			{when && (
				<span className={styles.dateChip}>
					<span className={styles.day}>{when.day}</span>
					<span className={styles.month}>{when.month}</span>
				</span>
			)}
		</div>
	);
}

/**
 * The event's kind in the platform's own words. One list, because the create
 * menu, the organiser's cards and the public catalogue all name the same five
 * things and must not drift apart.
 */
export function useEventTypeLabel() {
	const { t } = useTranslate();

	return (type: string | null | undefined) => {
		switch ((type ?? "").toUpperCase()) {
			case "MEETUP":
				return t("event.format.meetup", "Meetup");
			case "WORKSHOP":
				return t("event.format.workshop", "Workshop");
			case "GAMEJAM":
				return t("event.format.gamejam", "Game Jam");
			case "GAMELAB":
				return t("event.format.gamelab", "Game Lab");
			case "CONFERENCE":
				return t("event.format.conference", "Conference");
			default:
				return type ?? "";
		}
	};
}

const STATUS_TONE: Record<string, StatusTone> = {
	[EventStatus.Published]: "success",
	[EventStatus.Draft]: "neutral",
	[EventStatus.Archived]: "danger",
	[EventStatus.Closed]: "danger",
};

/**
 * An event's publication status, as a dot and a word.
 *
 * The tone map lived in two places and the label in one, so the organiser's
 * cards said "Published" while the admin table printed the raw enum. Wherever a
 * status is shown it is shown the same way.
 */
export function EventStatusDot({ status }: { status?: string | null }) {
	const { t } = useTranslate();

	const label = (() => {
		switch (status) {
			case EventStatus.Published:
				return t("event.status.published.short", "Published");
			case EventStatus.Draft:
				return t("event.status.draft", "Draft");
			case EventStatus.Archived:
				return t("event.status.archived", "Archived");
			case EventStatus.Closed:
				return t("event.status.closed", "Closed");
			default:
				return status ?? "";
		}
	})();

	return (
		<StatusDot tone={STATUS_TONE[status ?? ""] ?? "neutral"} label={label} />
	);
}

export { styles as eventCardStyles };
