"use client";

import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useQuery } from "@tanstack/react-query";
import { useTolgee, useTranslate } from "@tolgee/react";
import { theme } from "antd";
import axios from "axios";
import React from "react";
import styles from "@/app/hub/events/style.module.scss";
import eventBackgroundImage from "@/assets/images/public-events-header-bg.jpg";
import {
	BannerEventSlider,
	EmptyEventState,
	EventCard,
	EventSection,
	PastEventCard,
} from "@/components/events";
import SectionSkeleton from "@/components/events/SectionSkeleton";
import { PublicLayout } from "@/layouts/PublicLayout";

export default function EventsPage() {
	const { t } = useTranslate();
	const { getLanguage } = useTolgee();
	const { token } = theme.useToken();

	const { data: eventCount, isFetched: isCountFetched } = useQuery({
		queryKey: ["events-count"],
		queryFn: () =>
			axios
				.get("/api/events-count", { params: { lang: getLanguage() } })
				.then((res) => res.data),
		enabled: true,
	});

	const [loadingSections, setLoadingSections] = React.useState({
		knowledge: true,
		experiments: true,
		past: true,
	});

	const handleLoadingChange = React.useCallback(
		(key: keyof typeof loadingSections, isLoading: boolean) => {
			setLoadingSections((prev) => ({ ...prev, [key]: isLoading }));
		},
		[],
	);

	return (
		<PublicLayout
			title={t("page.events.title", "Events")}
			backgroundImage={eventBackgroundImage.src}
			seo={{ openGraph: { type: "website", url: "/events" } }}
		>
			<div className={styles.container}>
				{isCountFetched && eventCount?.count ? (
					<>
						<BannerEventSlider />

						{(loadingSections.knowledge ||
							loadingSections.experiments ||
							loadingSections.past) && (
							<>
								{loadingSections.knowledge && (
									<SectionSkeleton
										title={t("page.events.newKnowledge", "New Knowledge")}
										description={t(
											"page.events.newKnowledgeDescription",
											"Meetups and workshops for sharing experience, learning, and networking.",
										)}
									/>
								)}
								{loadingSections.experiments && (
									<SectionSkeleton
										title={t(
											"page.events.gameJamsAndExperiments",
											"Experience & Experiments",
										)}
										description={t(
											"page.events.gameJamsAndExperimentsDescription",
											"Game jams for practice, experiments, and new connections.",
										)}
									/>
								)}
								{loadingSections.past && (
									<SectionSkeleton
										title={t("page.events.pastEvents", "Some Past Events")}
										description={t(
											"page.events.pastEventsDescription",
											"Here are some of the platform's completed events.",
										)}
									/>
								)}
							</>
						)}

						<EventSection
							title={t("page.events.newKnowledge", "New Knowledge")}
							description={t(
								"page.events.newKnowledgeDescription",
								"Meetups and workshops for sharing experience, learning, and networking.",
							)}
							eventTypes={[
								prismaClient.$Enums.EventType.Meetup,
								prismaClient.$Enums.EventType.Workshop,
							]}
							timeStatus={["ongoing", "upcoming"]}
							CardComponent={EventCard}
							token={token}
							onLoadingChange={(isLoading) =>
								handleLoadingChange("knowledge", isLoading)
							}
						/>
						<EventSection
							title={t(
								"page.events.gameJamsAndExperiments",
								"Experience & Experiments",
							)}
							description={t(
								"page.events.gameJamsAndExperimentsDescription",
								"Game jams for practice, experiments, and new connections.",
							)}
							eventTypes={[
								prismaClient.$Enums.EventType.GameJam,
								prismaClient.$Enums.EventType.GameLab,
							]}
							timeStatus={["ongoing", "upcoming"]}
							CardComponent={EventCard}
							token={token}
							onLoadingChange={(isLoading) =>
								handleLoadingChange("experiments", isLoading)
							}
						/>
						<EventSection
							title={t("page.events.pastEvents", "Some Past Events")}
							description={t(
								"page.events.pastEventsDescription",
								"Here are some of the platform's completed events.",
							)}
							eventTypes={[
								prismaClient.$Enums.EventType.Meetup,
								prismaClient.$Enums.EventType.Workshop,
								prismaClient.$Enums.EventType.GameJam,
								prismaClient.$Enums.EventType.GameLab,
								prismaClient.$Enums.EventType.Conference,
							]}
							timeStatus={["past"]}
							CardComponent={PastEventCard}
							token={token}
							colSpan={{ xs: 24, sm: 12, md: 8, lg: 6, xl: 4 }}
							onLoadingChange={(isLoading) =>
								handleLoadingChange("past", isLoading)
							}
						/>
					</>
				) : isCountFetched ? (
					<EmptyEventState />
				) : null}
			</div>
		</PublicLayout>
	);
}
