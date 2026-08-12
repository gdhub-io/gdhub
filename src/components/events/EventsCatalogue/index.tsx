"use client";

import { useTranslate } from "@tolgee/react";
import { Empty, Flex, Select } from "antd";
import { useMemo, useState } from "react";
import { EventType } from "@/config/prisma-enums";
import { hasEventEnded } from "@/helpers/event";
import { useEventTypeLabel } from "../EventCardParts";
import { EventRow } from "../EventRow";
import { FeaturedEventCard } from "../FeaturedEventCard";
import { type PublicEvent, PublicEventCard } from "../PublicEventCard";
import styles from "./style.module.scss";

export type CatalogueEvent = PublicEvent & { isFeatured?: boolean };

/** Start of an event, for ordering. Undated events sort last. */
const startsAt = (event: CatalogueEvent) => {
	const first = event.schedule?.[0];
	return first ? new Date(first.startDate).getTime() : Number.MAX_SAFE_INTEGER;
};

/**
 * A section's events, as one row paged by arrows.
 */
function EventGrid({
	events,
	finished = false,
}: {
	events: CatalogueEvent[];
	finished?: boolean;
}) {
	return (
		<EventRow>
			{events.map((event) => (
				<PublicEventCard key={event.id} event={event} isFinished={finished} />
			))}
		</EventRow>
	);
}

/**
 * The event catalogue: one featured event, then everything else in a grid.
 *
 * Replaces the three hand-curated bands ("New Knowledge", "Experience &
 * Experiments", "Some Past Events") that each fetched their own slice. Those
 * split the catalogue by type whether or not anything was in the bucket, so a
 * quiet month showed three headings over three empty rows. One grid with a type
 * filter says the same thing and stays honest when there is little on.
 */
export function EventsCatalogue({
	events: loaded,
}: {
	/**
	 * Loaded on the server by both pages.
	 *
	 * The catalogue used to be able to fetch its own list as well, which is how
	 * the public page came to show nothing: `/api/events` is behind `withAuth`,
	 * so a logged-out visitor got a 401. Server-loading also puts the events in
	 * the HTML, where a crawler can see them — there is no reason left to fetch.
	 */
	events: CatalogueEvent[];
}) {
	const { t } = useTranslate();
	const typeLabel = useEventTypeLabel();
	const [type, setType] = useState<string>();

	// Filtering in memory rather than refetching: the catalogue is one page of
	// published events, and the dropdown should answer instantly.
	const events = useMemo(
		() => (type ? loaded.filter((event) => event.type === type) : loaded),
		[loaded, type],
	);

	const { featured, upcoming, past } = useMemo(() => {
		const all = events;
		// Only an event still to come earns the top slot — leading the page with
		// something that already happened is worse than leading with nothing.
		const featured =
			all.find((event) => event.isFeatured && !hasEventEnded(event.schedule)) ??
			null;
		const rest = featured
			? all.filter((event) => event.id !== featured.id)
			: all;

		return {
			featured,
			// Soonest first among what is still to come; most recent first among
			// what is over. Both are the order a person reads the section in.
			upcoming: rest
				.filter((event) => !hasEventEnded(event.schedule))
				.sort((a, b) => startsAt(a) - startsAt(b)),
			past: rest
				.filter((event) => hasEventEnded(event.schedule))
				.sort((a, b) => startsAt(b) - startsAt(a)),
		};
	}, [events]);

	return (
		<Flex vertical gap={24} className={styles.catalogue}>
			{featured && (
				<section>
					<FeaturedEventCard event={featured} />
				</section>
			)}

			{/* The header shows while a filter is on even with nothing to list —
			    otherwise hiding the empty section takes the only way to clear it. */}
			{(upcoming.length > 0 || !!type) && (
				<section>
					<Flex
						align="center"
						justify="space-between"
						gap={12}
						wrap
						className={styles.sectionHead}
					>
						<h2 className={styles.sectionTitle}>
							{t("page.events.upcoming", "Upcoming")}
						</h2>
						<Select
							allowClear
							variant="filled"
							value={type}
							onChange={setType}
							placeholder={t("page.events.allTypes", "All types")}
							className={styles.typeFilter}
							options={Object.values(EventType).map((value) => ({
								value,
								label: typeLabel(value),
							}))}
						/>
					</Flex>

					{upcoming.length > 0 && <EventGrid events={upcoming} />}
				</section>
			)}

			{past.length > 0 && (
				<section>
					<h2 className={styles.sectionTitle}>
						{t("page.events.past", "Past events")}
					</h2>
					<EventGrid events={past} finished />
				</section>
			)}

			{!featured && !upcoming.length && !past.length && (
				<Empty
					description={
						type
							? t("page.events.empty.filtered", "No events of this type")
							: t("page.events.empty", "No events yet")
					}
					className={styles.empty}
				/>
			)}
		</Flex>
	);
}

export default EventsCatalogue;
