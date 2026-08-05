"use client";

import { useTolgee } from "@tolgee/react";
import { Alert, Button, Flex, Grid, Space, Typography } from "antd";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useMemo, useRef } from "react";
import {
	getHubSectionShellClass,
	HubSectionBody,
} from "@/components/hub/HubSection";
import { useScrollAwareSticky } from "@/hooks/useScrollAwareSticky";
import styles from "./style.module.scss";

const DevlogPosts = dynamic(() => import("@/components/DevlogPosts"), {
	ssr: false,
});
const MyAdviceRequests = dynamic(
	() => import("@/components/MyAdviceRequests"),
	{ ssr: false },
);
const MyProjectList = dynamic(() => import("@/components/MyProjectList"), {
	ssr: false,
});
const NewMembers = dynamic(() => import("@/components/NewMembers"), {
	ssr: false,
});
const HotTeamVacancies = dynamic(
	() => import("@/components/HotTeamVacancies"),
	{ ssr: false },
);
const LatestEvents = dynamic(() => import("@/components/LatestEvents/index"), {
	ssr: false,
});
const HubQuickCounts = dynamic(
	() => import("@/components/hub/HubQuickCounts"),
	{ ssr: false },
);

const { Title, Text } = Typography;

export default function HubClient() {
	const session = useSession();
	const { getLanguage, t } = useTolgee();
	const screens = Grid.useBreakpoint();
	const isAuthenticated = session.status === "authenticated";
	const isOnboardingDone = !!session.data?.user?.onboardingDone;
	// Only the sticky behaviour asks about the breakpoint — never what renders.
	// Every block is mounted once and the grid decides where it lands, so moving
	// between widths costs a repaint rather than a remount and a refetch.
	const isWideLayout = !!screens.md;
	const showMainFeed = isAuthenticated && isOnboardingDone;
	const showOnboardingAlert = isAuthenticated && !isOnboardingDone;

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
					className={`${getHubSectionShellClass("inset")} ${styles.mainBundleSlot}`}
				>
					<HubSectionBody flush className={styles.welcomeHero}>
						<div className={styles.welcomeArtwork} aria-hidden="true">
							<svg
								className={styles.welcomeCurves}
								viewBox="0 0 320 100"
								preserveAspectRatio="xMaxYMid meet"
							>
								<title>Decoration</title>
								<path
									d="M 0 72 Q 80 20 160 56 T 320 40"
									fill="none"
									stroke="rgba(229, 62, 62, 0.35)"
									strokeWidth="2.5"
									strokeLinecap="round"
								/>
								<path
									d="M 20 88 Q 120 48 220 72 T 320 56"
									fill="none"
									stroke="rgba(245, 158, 11, 0.4)"
									strokeWidth="2"
									strokeLinecap="round"
								/>
								<path
									d="M 40 52 Q 140 8 260 44 T 320 28"
									fill="none"
									stroke="rgba(139, 92, 246, 0.35)"
									strokeWidth="2"
									strokeLinecap="round"
								/>
							</svg>
							<span className={styles.artDotOne} />
							<span className={styles.artDotTwo} />
							<span className={styles.artDotThree} />
						</div>

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

					<div className={styles.wideOnly}>
						<MyAdviceRequests variant="hubSidebar" />
					</div>
					<div className={styles.wideOnly}>
						<HotTeamVacancies />
					</div>
					<div className={styles.wideOnly}>
						<LatestEvents />
					</div>
					<div className={styles.wideOnly}>
						<NewMembers />
					</div>
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
