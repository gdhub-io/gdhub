import type { Event } from "@gdhub-io/gdhub-prisma";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Skeleton } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import {
	EventCover,
	useEventCover,
	useEventTypeLabel,
} from "@/components/events/EventCardParts";
import {
	getHubSectionShellClass,
	HubSectionBleed,
	HubSectionBody,
	HubSectionHeader,
} from "@/components/hub/HubSection";
import { LoadError } from "@/components/ui";
import styles from "./styles.module.scss";

type LatestEvent = Event & {
	// `directionId` rides along so the cover can take the craft's tint, the same
	// way the catalogue's cards do.
	schedule?: {
		startDate: string;
		endDate: string;
		directionId?: string | null;
	}[];
};

/** The cover of one row, sized by the event's own format. */
function EventTileCover({ event }: { event: LatestEvent }) {
	const { tint } = useEventCover(event);

	return (
		<EventCover
			image={event.image}
			tint={tint}
			when={null}
			kind=""
			type={event.type}
			fit="width"
		/>
	);
}

function parseDate(value: string) {
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? null : d;
}

function getEventTiming(
	schedule: { startDate: string; endDate: string }[] | undefined,
) {
	const now = new Date();
	const items = (schedule || [])
		.map((s) => ({ start: parseDate(s.startDate), end: parseDate(s.endDate) }))
		.filter((x) => !!x.start && !!x.end) as { start: Date; end: Date }[];

	if (!items.length) {
		return {
			isOngoing: false,
			isNotEnded: false,
			nextStart: null as Date | null,
			nearestEnd: null as Date | null,
		};
	}

	const notEndedItems = items.filter((i) => i.end.getTime() >= now.getTime());
	const isNotEnded = notEndedItems.length > 0;

	const isOngoing = notEndedItems.some(
		(i) =>
			i.start.getTime() <= now.getTime() && i.end.getTime() >= now.getTime(),
	);

	const nextStart = notEndedItems
		.map((i) => i.start)
		.filter((d) => d.getTime() >= now.getTime())
		.sort((a, b) => a.getTime() - b.getTime())[0];

	const nearestEnd = isOngoing
		? notEndedItems
				.map((i) => i.end)
				.sort((a, b) => a.getTime() - b.getTime())[0]
		: null;

	return { isOngoing, isNotEnded, nextStart: nextStart ?? null, nearestEnd };
}

export default function LatestEvents() {
	const { t } = useTranslate();
	const typeLabel = useEventTypeLabel();

	const {
		data: events,
		isLoading,
		isFetched,
		isError,
		refetch,
	} = useQuery<LatestEvent[]>({
		queryKey: ["latest-events"],
		queryFn: () =>
			axios
				.get<LatestEvent[]>("/api/events", {
					params: { withDates: true, timeStatus: ["upcoming", "ongoing"] },
				})
				.then((r) => r.data),
		staleTime: 1000 * 60 * 3,
	});

	const candidates = (events || [])
		.map((e) => ({ e, ...getEventTiming(e.schedule) }))
		// Everything still to come, running now included. A fortnight window used
		// to hide the rest, so a card headed "Upcoming events" went empty while
		// upcoming events existed — the list is capped at five below anyway, and
		// it is sorted soonest-first, so the near ones still lead.
		.filter((x) => x.isNotEnded && (x.isOngoing || !!x.nextStart))
		.sort((a, b) => {
			// ongoing first
			if (a.isOngoing !== b.isOngoing) return a.isOngoing ? -1 : 1;

			// ongoing: nearest end first
			if (a.isOngoing && b.isOngoing) {
				const aEnd = a.nearestEnd?.getTime() ?? Number.POSITIVE_INFINITY;
				const bEnd = b.nearestEnd?.getTime() ?? Number.POSITIVE_INFINITY;
				return aEnd - bEnd;
			}

			// upcoming soon: nearest start first
			const aStart = a.nextStart?.getTime() ?? Number.POSITIVE_INFINITY;
			const bStart = b.nextStart?.getTime() ?? Number.POSITIVE_INFINITY;
			return aStart - bStart;
		})
		.slice(0, 5);

	const title = t("hub.latest-events.title", "Upcoming events");

	if (isError && !events)
		return (
			<section
				className={`${styles.container} ${getHubSectionShellClass("sidebar")}`}
			>
				<HubSectionHeader title={title} />
				<HubSectionBody>
					<LoadError
						bare
						title={t("hub.latest-events.error", "Events could not be loaded")}
						onRetry={() => refetch()}
					/>
				</HubSectionBody>
			</section>
		);
	if (!candidates.length && isFetched) return null;

	return (
		<Skeleton active loading={isLoading}>
			<section
				className={`${styles.container} ${getHubSectionShellClass("sidebar")}`}
			>
				<HubSectionHeader
					title={title}
					linkHref="/hub/events"
					linkLabel={t("hub.view-all", "View all")}
				/>

				<HubSectionBody flush>
					{candidates.map(({ e, isOngoing, nextStart, nearestEnd }) => (
						<Link
							key={e.id}
							href={`/event/${e.slug}`}
							target="_blank"
							className={styles.tile}
						>
							{/* The same cover the catalogue draws, so the two upload formats
							    keep their shapes here too: the tile gives the width and the
							    ratio decides the height. No chips — the kind and the dates
							    are already in the line below. */}
							<EventTileCover event={e} />

							<div className={styles.text}>
								<div className={styles.meta}>
									{/* No "Ongoing" label: the row already says when the event
									    ends, which is the useful half, and the word only
									    repeated what the date implies. */}
									{[
										typeLabel(e.type),
										isOngoing
											? `${t("hub.latest-events.until", "until")} ${dayjs(nearestEnd).format("ll")}`
											: `${t("hub.latest-events.starts", "Starts")}: ${dayjs(nextStart).format("ll")}`,
									]
										.filter(Boolean)
										.join(" · ")}
								</div>
								<div className={styles.name}>{e.title}</div>
							</div>
						</Link>
					))}
				</HubSectionBody>
			</section>
		</Skeleton>
	);
}
