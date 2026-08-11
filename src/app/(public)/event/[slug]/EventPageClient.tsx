"use client";

import type { Event, EventScheduleItem } from "@gdhub-io/gdhub-prisma";
import { useTolgee } from "@tolgee/react";
import { Typography } from "antd";
import { useEffect, useState } from "react";
import EventConferenceOrGamelabView from "@/components/event/EventConferenceOrGamelabView";
import EventDefaultView from "@/components/event/EventDefaultView";
import { PublicPageHeader } from "@/components/layouts/PublicPageHeader";
import { isHeadlineEvent } from "@/helpers/event";
import { formatEventPeriod } from "@/helpers/format";
import { useWorkDirections } from "@/hooks/library";
import styles from "./style.module.scss";

const { Text } = Typography;

export interface EventPageProps {
	event: Event & { schedule: EventScheduleItem[] };
	seo?: {
		title: string | null;
		description?: string | null;
		image?: string | null;
	};
}

export function EventPageClient({ event }: EventPageProps) {
	const { data: workDirections } = useWorkDirections();
	const { getLanguage, t } = useTolgee();

	const [formattedSchedule, setFormattedSchedule] = useState<any[]>([]);

	useEffect(() => {
		if (!event?.schedule) return;
		setFormattedSchedule(
			event.schedule.map((item: any) => ({
				...item,
				formattedStartDay: new Date(item.startDate).toLocaleDateString(),
				formattedEndDay: new Date(item.endDate).toLocaleDateString(),
				formattedStartTime: new Date(item.startDate).toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
					hour12: true,
				}),
				formattedStartTime24: new Date(item.startDate).toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
					hour12: false,
				}),
				formattedAMPM: new Date(item.startDate)
					.toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
						hour12: true,
					})
					.split(" ")[1],
				formattedEndTime: new Date(item.endDate).toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
				}),
			})),
		);
	}, [event?.schedule]);

	if (!event) return null;

	const schedule = formattedSchedule.length
		? formattedSchedule
		: event.schedule || [];
	const isConferenceOrGamelab = isHeadlineEvent(event.type);

	return (
		<>
			<PublicPageHeader
				backTo={
					isConferenceOrGamelab
						? undefined
						: {
								href: "/events",
								label: t("page.events.allEvents", "Events"),
							}
				}
				extra={
					!isConferenceOrGamelab && (
						<>
							<span className={styles.extraSep}>/</span>
							<Text className={styles.extraText}>{event.type}</Text>
							<span className={styles.extraSep}>/</span>
							<Text className={styles.extraText}>
								{schedule.length > 0
									? formatEventPeriod(
											schedule[0].startDate,
											schedule[schedule.length - 1].endDate,
											getLanguage() || "en",
											"day",
										)
									: "-"}
							</Text>
						</>
					)
				}
				title={!isConferenceOrGamelab ? event.title : undefined}
				subTitle={
					!isConferenceOrGamelab ? event.shortDescription || "" : undefined
				}
				backgroundImage={event.image || undefined}
			/>
			<div className="layout-background">
				{isConferenceOrGamelab ? (
					<EventConferenceOrGamelabView
						event={event}
						workDirections={workDirections || []}
						schedule={schedule}
					/>
				) : (
					<EventDefaultView
						event={event}
						workDirections={workDirections || []}
						schedule={schedule}
					/>
				)}
			</div>
		</>
	);
}
