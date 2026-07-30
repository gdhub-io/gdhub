import type { Event, EventScheduleItem } from "@gdhub-io/gdhub-prisma";
import { FaChalkboardTeacher } from "@react-icons/all-files/fa/FaChalkboardTeacher";
import { FaMicroscope } from "@react-icons/all-files/fa/FaMicroscope";
import { FaRegCalendarCheck } from "@react-icons/all-files/fa/FaRegCalendarCheck";
import { FaUsers } from "@react-icons/all-files/fa/FaUsers";
import { GiGamepad } from "@react-icons/all-files/gi/GiGamepad";
import { useTolgee } from "@tolgee/react";
import { Card, Tag } from "antd";
import Image from "next/image";
import Link from "next/link";
import React, { useMemo, useState } from "react";
import { EventType } from "@/config/prisma-enums";
import { formatEventPeriod } from "@/helpers/format";
import styles from "./style.module.scss";

function getTypeIcon(type: EventType) {
	switch (type) {
		case EventType.Meetup:
			return <FaUsers size={28} />;
		case EventType.GameJam:
			return <GiGamepad size={28} />;
		case EventType.Workshop:
			return <FaChalkboardTeacher size={28} />;
		case EventType.GameLab:
			return <FaMicroscope size={28} />;
		case EventType.Conference:
			return <FaRegCalendarCheck size={28} />;
		default:
			return null;
	}
}

export const EventCard = ({
	event,
	token,
}: {
	event: Event & { schedule: EventScheduleItem[] };
	token: any;
}) => {
	const { t, getLanguage } = useTolgee();
	const now = useMemo(() => new Date(), []);
	const [hovered, setHovered] = useState(false);
	const typeLabels: Record<EventType, string> = {
		[EventType.Meetup]: "Meetup",
		[EventType.GameJam]: "Gamejam",
		[EventType.Workshop]: "Workshop",
		[EventType.GameLab]: "Gamelab",
		[EventType.Conference]: "Conference",
	};

	return (
		<Link href={`/event/${event.lang}/${event.slug}`} target="_blank">
			<Card
				onMouseEnter={() => setHovered(true)}
				onMouseLeave={() => setHovered(false)}
				style={{
					borderRadius: 16,
					overflow: "hidden",
					boxShadow: hovered ? token.boxShadowSecondary : token.boxShadow,
					background: token.colorBgContainer,
					display: "flex",
					flexDirection: "column",
					width: "100%",
					aspectRatio: "1/1.1",
					margin: "0 auto",
					cursor: "pointer",
					transition: "box-shadow 0.2s",
					border: undefined,
				}}
				styles={{
					body: {
						padding: 0,
						height: 0,
					},
				}}
				cover={
					event.image ? (
						<div
							style={{
								position: "relative",
								width: "100%",
								aspectRatio: "1/1.1",
								overflow: "hidden",
							}}
						>
							<Image
								src={event.image}
								alt={event.title}
								fill
								style={{ objectFit: "cover", aspectRatio: "1/1.1" }}
								sizes="(max-width: 600px) 100vw, 33vw"
							/>
							<div className={styles.eventCardContent}>
								<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
									<span className={styles.eventTypeIcon}>
										{getTypeIcon(event.type)}
									</span>
									<span className={styles.eventType}>
										{typeLabels[event.type]}
									</span>
								</div>
								<div className={styles.eventTitle}>{event.title}</div>
								{event.shortDescription ? (
									<div className={styles.eventDesc}>
										{event.shortDescription}
									</div>
								) : null}
								<div
									style={{
										fontWeight: 600,
										color: hovered
											? token.colorError
											: token.colorTextSecondary,
										fontSize: 15,
										marginTop: 8,
										transition: "color 0.2s, opacity 0.2s",
										opacity: hovered ? 1 : 0,
									}}
								>
									{t("event.readMore", "Click to read more")}
								</div>
							</div>
							{Boolean(event.schedule?.length) && (
								<Tag
									style={{
										position: "absolute",
										top: 16,
										right: 16,
										zIndex: 3,
										background: token.colorBgContainer,
										color: token.colorText,
										fontWeight: 600,
									}}
								>
									{formatEventPeriod(
										event.schedule[0].startDate,
										event.schedule[event.schedule.length - 1].endDate,
										getLanguage(),
										"day",
									)}
								</Tag>
							)}
							{/* <Tag
						color={event.isFree ? 'green' : 'red'}
						style={{
							position: 'absolute',
							bottom: 16,
							right: 16,
							zIndex: 3,
							fontWeight: 600,
						}}
					>
						{event.isFree ? t('event.type.free', 'Free') : t('event.type.paid', 'Paid')}
					</Tag> */}
						</div>
					) : null
				}
			/>
		</Link>
	);
};
