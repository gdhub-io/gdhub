"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, theme } from "antd";
import axios from "axios";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSession } from "next-auth/react";
import React, { Suspense } from "react";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
import { EventType } from "@/config/prisma-enums";
import styles from "./style.module.scss";

const BannerEventSlider = dynamic(
	() =>
		import("@/components/events/BannerEventSlider").then(
			(m) => m.BannerEventSlider,
		),
	{ ssr: false },
);
const EmptyEventState = dynamic(
	() => import("@/components/events/EmptyEventState").then((m) => m.default),
	{ ssr: false },
);
const EventCard = dynamic(
	() => import("@/components/events/EventCard").then((m) => m.EventCard),
	{ ssr: false },
);
const EventSection = dynamic(
	() => import("@/components/events/EventSection").then((m) => m.EventSection),
	{ ssr: false },
);
const PastEventCard = dynamic(
	() =>
		import("@/components/events/PastEventCard").then((m) => m.PastEventCard),
	{ ssr: false },
);
const SectionSkeleton = dynamic(
	() => import("@/components/events/SectionSkeleton").then((m) => m.default),
	{ ssr: false },
);

export default function EventsClient() {
	const { t } = useTranslate();
	const { token } = theme.useToken();
	const { data: session } = useSession();

	const { data: eventCount, isFetched: isCountFetched } = useQuery({
		queryKey: ["user-event-count", session?.user?.id],
		queryFn: () => axios.get("/api/user/event/count").then((res) => res.data),
		enabled: Boolean(session?.user?.id),
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

	const onKnowledgeLoadingChange = React.useCallback(
		(isLoading: boolean) => handleLoadingChange("knowledge", isLoading),
		[handleLoadingChange],
	);
	const onExperimentsLoadingChange = React.useCallback(
		(isLoading: boolean) => handleLoadingChange("experiments", isLoading),
		[handleLoadingChange],
	);
	const onPastLoadingChange = React.useCallback(
		(isLoading: boolean) => handleLoadingChange("past", isLoading),
		[handleLoadingChange],
	);

	return (
		<div className="layout-background">
			<ProtectedPageHeader
				title={t("page.events.title", "Events")}
				extra={
					!!eventCount?.userCount && (
						<Link href="/user/events">
							<Button type="text">
								{t("page.events.myEvents", "My Events")}
							</Button>
						</Link>
					)
				}
			/>
			<div className={styles.container}>
				{isCountFetched && eventCount?.totalPublishedCount ? (
					<>
						<BannerEventSlider />

						{(loadingSections.knowledge ||
							loadingSections.experiments ||
							loadingSections.past) && (
							<SectionSkeleton
								title={t("page.events.newKnowledge", "New Knowledge")}
								description={t(
									"page.events.newKnowledgeDescription",
									"Meetups and workshops for sharing experience, learning, and networking.",
								)}
							/>
						)}

						<Suspense>
							<EventSection
								title={t("page.events.newKnowledge", "New Knowledge")}
								description={t(
									"page.events.newKnowledgeDescription",
									"Meetups and workshops for sharing experience, learning, and networking.",
								)}
								eventTypes={[EventType.Meetup, EventType.Workshop]}
								timeStatus={["ongoing", "upcoming"]}
								CardComponent={EventCard}
								token={token}
								onLoadingChange={onKnowledgeLoadingChange}
							/>
						</Suspense>
						<Suspense>
							<EventSection
								title={t(
									"page.events.gameJamsAndExperiments",
									"Experience & Experiments",
								)}
								description={t(
									"page.events.gameJamsAndExperimentsDescription",
									"Game jams for practice, experiments, and new connections.",
								)}
								eventTypes={[EventType.GameJam, EventType.GameLab]}
								timeStatus={["ongoing", "upcoming"]}
								CardComponent={EventCard}
								token={token}
								onLoadingChange={onExperimentsLoadingChange}
							/>
						</Suspense>
						<Suspense>
							<EventSection
								title={t("page.events.pastEvents", "Some Past Events")}
								description={t(
									"page.events.pastEventsDescription",
									"Here are some of the platform's completed events.",
								)}
								eventTypes={[
									EventType.Meetup,
									EventType.Workshop,
									EventType.GameJam,
									EventType.GameLab,
									EventType.Conference,
								]}
								timeStatus={["past"]}
								CardComponent={PastEventCard}
								token={token}
								colSpan={{ xs: 24, sm: 12, md: 8, lg: 6, xl: 4 }}
								onLoadingChange={onPastLoadingChange}
							/>
						</Suspense>
					</>
				) : isCountFetched ? (
					<EmptyEventState />
				) : null}
			</div>
		</div>
	);
}
