"use client";

import { ArrowLeftOutlined } from "@ant-design/icons";
import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useTolgee } from "@tolgee/react";
import { Button, Flex, Space, Typography } from "antd";
import Link from "next/link";
import { useEffect, useState } from "react";
import EventConferenceOrGamelabView from "@/components/event/EventConferenceOrGamelabView";
import EventDefaultView from "@/components/event/EventDefaultView";
import { formatEventPeriod } from "@/helpers/format";
import { useWorkDirections } from "@/hooks/library";
import { PublicLayout } from "@/layouts/PublicLayout";
import styles from "@/pages/event/style.module.scss";

const { Text } = Typography;

export interface EventPageProps {
	event: prismaClient.Event & { schedule: prismaClient.EventScheduleItem[] };
	seo?: {
		title: string | null;
		description?: string | null;
		image?: string | null;
	};
}

export function EventPageClient({ event, seo }: EventPageProps) {
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
	const isConferenceOrGamelab = ["conference", "gamelab"].includes(
		(event.type || "").toLowerCase(),
	);

	return (
		<PublicLayout
			seo={(seo ?? undefined) as any}
			extraPosition="top"
			extraGap={0}
			extra={
				!isConferenceOrGamelab && (
					<Flex gap={8} align="center">
						<Link href={`/events`}>
							<Button
								type="text"
								size="small"
								className={styles.parentLink}
								onMouseEnter={(e) => {
									const button = e.currentTarget;
									const arrow = button.querySelector(".arrow") as HTMLElement;
									if (arrow) {
										arrow.style.width = "16px";
										arrow.style.marginRight = "8px";
										arrow.style.opacity = "1";
									}
									button.style.paddingLeft = "8px";
									button.style.paddingRight = "8px";
								}}
								onMouseLeave={(e) => {
									const button = e.currentTarget;
									const arrow = button.querySelector(".arrow") as HTMLElement;
									if (arrow) {
										arrow.style.width = "0";
										arrow.style.marginRight = "0";
										arrow.style.opacity = "0";
									}
									button.style.paddingLeft = "0";
									button.style.paddingRight = "0";
								}}
							>
								<Space size={0}>
									<ArrowLeftOutlined
										className="arrow"
										style={{
											width: 0,
											marginRight: 0,
											opacity: 0,
											transition: "all 0.3s ease",
											overflow: "hidden",
											color: "#ff4d4f",
										}}
									/>
									<Text className={styles.extraText}>
										{t("page.events.allEvents", "Events")}
									</Text>
								</Space>
							</Button>
						</Link>
						<span style={{ color: "#ffffff54", lineHeight: 1, fontSize: 16 }}>
							/
						</span>
						<Text className={styles.extraText}>{event.type}</Text>
						<span style={{ color: "#ffffff54", lineHeight: 1, fontSize: 16 }}>
							/
						</span>
						<Text strong style={{ color: "#fff" }}>
							{schedule.length > 0
								? formatEventPeriod(
										schedule[0].startDate,
										schedule[schedule.length - 1].endDate,
										getLanguage() || "en",
										"day",
									)
								: "-"}
						</Text>
					</Flex>
				)
			}
			title={!isConferenceOrGamelab ? event.title : undefined}
			subTitle={
				!isConferenceOrGamelab ? event.shortDescription || "" : undefined
			}
			backgroundImage={event.image || undefined}
			ogImageType={isConferenceOrGamelab ? "event-big" : "event-small"}
			ogImageParams={{
				type: event.type,
				date: event.schedule?.length
					? formatEventPeriod(
							event.schedule[0].startDate,
							event.schedule[event.schedule.length - 1].endDate,
							getLanguage(),
							"day",
						)
					: "",
			}}
		>
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
		</PublicLayout>
	);
}
