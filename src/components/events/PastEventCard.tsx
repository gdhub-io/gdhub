import type { Event, EventScheduleItem } from "@gdhub-io/gdhub-prisma";
import { useTolgee } from "@tolgee/react";
import { Card } from "antd";
import Image from "next/image";
import React from "react";
import { formatEventPeriod } from "@/helpers/format";
import styles from "./PastEventCard.module.css";

export const PastEventCard = ({
	event,
	token,
}: {
	event: Event & { schedule: EventScheduleItem[] };
	token: any;
}) => {
	const { getLanguage } = useTolgee();

	return (
		<Card
			className={styles["past-event-card"]}
			cover={
				<div
					style={{
						width: "100%",
						aspectRatio: "1/1.1",
						overflow: "hidden",
						position: "relative",
					}}
				>
					{event.image ? (
						<Image
							src={event.image}
							alt={event.title}
							fill
							style={{
								width: "100%",
								height: "100%",
								objectFit: "cover",
								aspectRatio: "1/1.1",
								filter: "grayscale(1)",
							}}
							sizes="(max-width: 600px) 100vw, 33vw"
						/>
					) : (
						// Events without a cover still need the tinted backdrop the
						// title gradient sits on.
						<div
							style={{
								width: "100%",
								height: "100%",
								background: token.colorFillSecondary,
							}}
						/>
					)}
					<div
						className={styles["event-details"]}
						style={{
							position: "absolute",
							bottom: 0,
							left: 0,
							width: "100%",
							padding: 16,
							background:
								"linear-gradient(0deg, rgba(30,30,30,0.85) 80%, rgba(30,30,30,0.1) 100%, rgba(0,0,0,0) 100%)",
							color: "var(--gd-color-surface)",
							zIndex: 2,
							display: "flex",
							flexDirection: "column",
							gap: 8,
						}}
					>
						<div className={styles["event-title"]}>{event.title}</div>
						{event.schedule?.length && (
							<div className={styles["event-dates"]}>
								{formatEventPeriod(
									event.schedule[0].startDate,
									event.schedule[event.schedule.length - 1].endDate,
									getLanguage(),
									"day",
								)}
							</div>
						)}
					</div>
				</div>
			}
			style={{
				borderRadius: 12,
				overflow: "hidden",
				boxShadow: token.boxShadow,
				background: token.colorBgContainer,
				width: "100%",
				aspectRatio: "1/1.1",
				margin: "0 auto",
			}}
			styles={{
				body: {
					padding: 0,
					height: 0,
				},
			}}
		/>
	);
};
