"use client";

import { useTolgee, useTranslate } from "@tolgee/react";
import { Alert, Button, Flex, Grid, Space, Typography } from "antd";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useMemo, useRef } from "react";
import { useAccess } from "@/components/access/AccessProvider";
import DevlogPosts from "@/components/DevlogPosts";
import { HubQuickCountsSkeleton } from "@/components/hub/HubQuickCounts/HubQuickCountsSkeleton";
import {
	getHubSectionShellClass,
	HubSectionBody,
} from "@/components/hub/HubSection";
import { HubSidebarSkeleton } from "@/components/hub/HubSidebarSkeleton";
import { WelcomeCharacter } from "@/components/hub/WelcomeCharacter";
import { useScrollAwareSticky } from "@/hooks/useScrollAwareSticky";
import styles from "./style.module.scss";

// Each loader draws its card's header and placeholder rows, so the sidebar keeps
// its shape while the chunks download instead of filling in from nothing.
function SidebarLoading({
	titleKey,
	defaultTitle,
	media,
}: {
	titleKey: string;
	defaultTitle: string;
	media?: "square" | "circle";
}) {
	const { t } = useTranslate();
	return <HubSidebarSkeleton title={t(titleKey, defaultTitle)} media={media} />;
}

const MyAdviceRequests = dynamic(
	() => import("@/components/MyAdviceRequests"),
	{
		ssr: false,
		loading: () => (
			<SidebarLoading
				titleKey="page.hub.advice-requests"
				defaultTitle="Advice Requests"
				media="circle"
			/>
		),
	},
);
const MyProjectList = dynamic(() => import("@/components/MyProjectList"), {
	ssr: false,
	loading: () => (
		<SidebarLoading
			titleKey="page.hub.user-projects"
			defaultTitle="My projects"
		/>
	),
});
const NewMembers = dynamic(() => import("@/components/NewMembers"), {
	ssr: false,
	loading: () => (
		<SidebarLoading
			titleKey="page.hub.new-members"
			defaultTitle="New members"
			media="circle"
		/>
	),
});
const HotTeamVacancies = dynamic(
	() => import("@/components/HotTeamVacancies"),
	{
		ssr: false,
		loading: () => (
			<SidebarLoading
				titleKey="hub.hot-vacancies.title"
				defaultTitle="Open positions"
			/>
		),
	},
);
const LatestEvents = dynamic(() => import("@/components/LatestEvents/index"), {
	ssr: false,
	loading: () => (
		<SidebarLoading
			titleKey="hub.latest-events.title"
			defaultTitle="Upcoming events"
		/>
	),
});
const HubQuickCounts = dynamic(
	() => import("@/components/hub/HubQuickCounts"),
	{ ssr: false, loading: () => <HubQuickCountsSkeleton /> },
);

const { Title, Text } = Typography;

export default function HubClient({
	feedVisible,
}: {
	/**
	 * What the server already knows about this user. `useSession()` reports
	 * "loading" on the first render on both sides, and without this the feed
	 * would be absent from the HTML and appear only after hydration.
	 */
	feedVisible: boolean;
}) {
	const session = useSession();
	const { can } = useAccess();
	const { getLanguage, t } = useTolgee();
	const screens = Grid.useBreakpoint();
	const isAuthenticated = session.status === "authenticated";
	const isOnboardingDone = !!session.data?.user?.onboardingDone;
	// Only the sticky behaviour asks about the breakpoint — never what renders.
	// Every block is mounted once and the grid decides where it lands, so moving
	// between widths costs a repaint rather than a remount and a refetch.
	const isWideLayout = !!screens.md;
	const sessionSettled = session.status !== "loading";
	const showMainFeed = sessionSettled
		? isAuthenticated && isOnboardingDone
		: feedVisible;
	const showOnboardingAlert =
		sessionSettled && isAuthenticated && !isOnboardingDone;

	// The sidebar is taller than the viewport, so it follows the reading
	// direction: down until its last card meets the bottom edge, back up until
	// its first meets the top. 36px matches the content padding.
	const sidebarRef = useRef<HTMLDivElement>(null);
	useScrollAwareSticky(sidebarRef, { offset: 36, enabled: isWideLayout });

	const linkToChat = useMemo(() => {
		switch (getLanguage()) {
			case "en":
				return "https://t.me/gdhub_en";
			case "ru":
				return "https://t.me/gdhub_io";
			default:
				return "";
		}
	}, [getLanguage]);

	return (
		/* One grid, three areas. The markup order is the phone order — greeting,
		   your own blocks, then the infinite feed — and the wide layout is made by
		   `grid-template-areas`, not by reordering or re-rendering anything. */
		<div className={styles.hubGrid}>
			<div className={styles.welcomeArea}>
				<section
					className={`${getHubSectionShellClass("inset")} ${styles.mainBundleSlot} ${styles.welcomeSlot}`}
				>
					<HubSectionBody flush className={styles.welcomeHero}>
						<WelcomeCharacter userId={session?.data?.user?.id} />

						<div className={styles.welcomeContent}>
							<Flex vertical gap={4}>
								<Title level={2} className={styles.welcomeTitle}>
									{t("hub.welcome-title", "Welcome back, {userName} 👋", {
										userName: session?.data?.user?.name ?? "there",
									})}
								</Title>
								<Text type="secondary" className={styles.welcomeSubtitle}>
									{t(
										"hub.welcome-subtitle",
										"It's a good day for game development",
									)}
								</Text>
							</Flex>
						</div>
					</HubSectionBody>
				</section>

				{showOnboardingAlert && (
					<div
						className={`${getHubSectionShellClass("inset")} ${styles.mainBundleSlot}`}
					>
						<HubSectionBody>
							<Alert
								type="warning"
								title={
									<Space orientation="vertical">
										<div>
											{t(
												"hub.text1.part1",
												"Now you can get acquainted with our platform, but in order to be able to create your own projects or respond to the vacancies of others, you need to complete the registration by filling in the necessary information about yourself.",
											)}
											<br />
											{t(
												"hub.text1.part2",
												"And don&apos;t forget to join the community chat using",
											)}{" "}
											<Link href={linkToChat} target="_blank">
												this link.
											</Link>
										</div>
										<Link href="/registration/onboarding">
											<Button>
												{t("hub.text1.part3", "Complete Registration")}
											</Button>
										</Link>
									</Space>
								}
							/>
						</HubSectionBody>
					</div>
				)}
			</div>

			<aside className={styles.asideArea} ref={sidebarRef}>
				<Flex vertical gap={16}>
					{showMainFeed && <MyProjectList variant="hubSidebar" />}

					{/* The phone form of the four blocks below it. */}
					{showMainFeed && (
						<div className={styles.narrowOnly}>
							<HubQuickCounts />
						</div>
					)}

					{/* Each card is drawn for whoever may open what it links to. The
					    page behind the card checks the same permission, so a card can no
					    longer offer a door the user is refused at — and the card itself
					    stops showing data the space gates. */}
					{can("hub.experts.request") && (
						<div className={styles.wideOnly}>
							<MyAdviceRequests variant="hubSidebar" />
						</div>
					)}
					{can("hub.jobs.view") && (
						<div className={styles.wideOnly}>
							<HotTeamVacancies />
						</div>
					)}
					{can("hub.events.view") && (
						<div className={styles.wideOnly}>
							<LatestEvents />
						</div>
					)}
					{can("hub.talent_pool.view") && (
						<div className={styles.wideOnly}>
							<NewMembers />
						</div>
					)}
				</Flex>
			</aside>

			{showMainFeed && (
				<div className={styles.feedArea}>
					<DevlogPosts variant="hub" bundleInset />
				</div>
			)}
		</div>
	);
}
