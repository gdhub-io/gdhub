"use client";

import { useQuery } from "@tanstack/react-query";
import { useTolgee, useTranslate } from "@tolgee/react";
import { Col, Empty, Flex, Row, Select, Skeleton } from "antd";
import axios from "axios";
import { useMemo, useState } from "react";
import { EventType } from "@/config/prisma-enums";
import { hasEventEnded } from "@/helpers/event";
import { useEventTypeLabel } from "../EventCardParts";
import { FeaturedEventCard } from "../FeaturedEventCard";
import { type PublicEvent, PublicEventCard } from "../PublicEventCard";
import styles from "./style.module.scss";

export type CatalogueEvent = PublicEvent & { isFeatured?: boolean };

/**
 * The event catalogue: one featured event, then everything else in a grid.
 *
 * Replaces the three hand-curated bands ("New Knowledge", "Experience &
 * Experiments", "Some Past Events") that each fetched their own slice. Those
 * split the catalogue by type whether or not anything was in the bucket, so a
 * quiet month showed three headings over three empty rows. One grid with a type
 * filter says the same thing and stays honest when there is little on.
 */
/** Start of an event, for ordering. Undated events sort last. */
const startsAt = (event: CatalogueEvent) => {
	const first = event.schedule?.[0];
	return first ? new Date(first.startDate).getTime() : Number.MAX_SAFE_INTEGER;
};

function EventGrid({
	events,
	finished = false,
}: {
	events: CatalogueEvent[];
	finished?: boolean;
}) {
	return (
		<Row gutter={[16, 16]}>
			{events.map((event) => (
				<Col key={event.id} xs={24} sm={12} lg={8} xl={6}>
					<PublicEventCard event={event} isFinished={finished} />
				</Col>
			))}
		</Row>
	);
}

export function EventsCatalogue({
	events: provided,
}: {
	/**
	 * Pre-loaded on the server. The public page passes this because its data
	 * endpoint needs a session — `/api/events` is `withAuth`, so a logged-out
	 * visitor got a 401 and an empty catalogue. Rendering it on the server also
	 * puts the events in the HTML, where a crawler can see them.
	 */
	events?: CatalogueEvent[];
} = {}) {
	const { t } = useTranslate();
	const { getLanguage } = useTolgee();
	const typeLabel = useEventTypeLabel();
	const [type, setType] = useState<string>();

	const { data: fetched, isFetching } = useQuery<CatalogueEvent[]>({
		queryKey: ["events", "catalogue"],
		queryFn: () =>
			axios
				.get<CatalogueEvent[]>("/api/events", {
					params: { withDates: true, lang: getLanguage() },
				})
				.then((res) => res.data),
		enabled: !provided,
	});

	// Filtering in memory rather than refetching: the catalogue is one page of
	// published events, and the dropdown should answer instantly.
	const events = useMemo(() => {
		const all = provided ?? fetched;
		if (!all) return all;

		return type ? all.filter((event) => event.type === type) : all;
	}, [provided, fetched, type]);

	const { featured, upcoming, past } = useMemo(() => {
		const all = events ?? [];
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

	if (!provided && isFetching && !events) {
		return (
			<Flex vertical gap={24} className={styles.catalogue}>
				<Skeleton active paragraph={{ rows: 4 }} />
				<Skeleton active paragraph={{ rows: 6 }} />
			</Flex>
		);
	}

	return (
		<Flex vertical gap={24} className={styles.catalogue}>
			<Flex justify="flex-end">
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

			{featured && (
				<section>
					<h2 className={styles.sectionTitle}>
						{t("page.events.featured", "Featured")}
					</h2>
					<FeaturedEventCard event={featured} />
				</section>
			)}

			{upcoming.length > 0 && (
				<section>
					<h2 className={styles.sectionTitle}>
						{t("page.events.upcoming", "Upcoming")}
					</h2>
					<EventGrid events={upcoming} />
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
