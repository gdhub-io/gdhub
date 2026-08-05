"use client";

import { IconChevronRight } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import axios from "axios";
import Link from "next/link";
import { useSession } from "next-auth/react";
import qs from "qs";
import { useAccess } from "@/components/access/AccessProvider";
import { AdviceRequestStatus } from "@/config/prisma-enums";
import styles from "./styles.module.scss";

type AdviceRequest = {
	toUser?: { id: string } | null;
	fromUser?: { id: string } | null;
};

/**
 * The sidebar, folded into four counters.
 *
 * On a phone the feed is infinite, so nothing survives below it — the blocks
 * that live in the desktop sidebar have to say their piece above the feed, in
 * one line each. Every pill is the same component and every one links to the
 * page that holds the full list.
 *
 * The queries are the ones the sidebar blocks already run, keyed identically:
 * at desktop width the cache is warm and this costs nothing, and at mobile width
 * the sidebar blocks are hidden but their data is what fills these counters.
 */
export function HubQuickCounts({ className }: { className?: string }) {
	const { t } = useTranslate();
	const { data: session } = useSession();
	const { can } = useAccess();
	const userId = session?.user?.id;

	const { data: adviceRequests } = useQuery<AdviceRequest[]>({
		queryKey: ["advice-requests"],
		queryFn: () =>
			axios
				.get<AdviceRequest[]>("/api/user/advice-requests", {
					params: {
						status: [AdviceRequestStatus.Created, AdviceRequestStatus.Approved],
					},
					paramsSerializer: (params) =>
						qs.stringify(params, { arrayFormat: "repeat" }),
				})
				.then((res) => res.data),
		enabled: !!userId && can("hub.experts.request"),
	});

	const { data: latestUsers } = useQuery<unknown[]>({
		queryKey: ["latest-users"],
		queryFn: () =>
			axios.get<unknown[]>("/api/users/latest").then((r) => r.data),
	});

	const { data: hotVacancies } = useQuery<unknown[]>({
		queryKey: ["hot-team-vacancies"],
		queryFn: () =>
			axios.get<unknown[]>("/api/vacancies/hot").then((r) => r.data),
		enabled: can("hub.jobs.view"),
	});

	const { data: latestEvents } = useQuery<unknown[]>({
		queryKey: ["latest-events"],
		queryFn: () =>
			axios
				.get<unknown[]>("/api/events", {
					params: { withDates: true, timeStatus: ["upcoming", "ongoing"] },
				})
				.then((r) => r.data),
		staleTime: 1000 * 60 * 3,
		enabled: can("hub.events.view"),
	});

	// Only incoming: an outgoing request is one the user already sent, so it is
	// not waiting on them and does not belong in a "needs you" counter.
	const incomingCount = adviceRequests
		? adviceRequests.filter((request) => request.toUser?.id === userId).length
		: 0;

	const counts = [
		{
			key: "requests",
			count: incomingCount,
			label: t("hub.counts.incomingRequests", "Incoming requests"),
			href: "/user/advice-requests",
			/** The only counter waiting on an answer — the rest are things to browse. */
			awaiting: true,
		},
		{
			key: "members",
			count: latestUsers?.length ?? 0,
			label: t("hub.counts.newMembers", "New members"),
			href: "/hub/members",
			awaiting: false,
		},
		{
			key: "positions",
			count: hotVacancies?.length ?? 0,
			label: t("hub.counts.openPositions", "Open positions"),
			href: "/hub/jobs",
			awaiting: false,
		},
		{
			key: "events",
			count: latestEvents?.length ?? 0,
			label: t("hub.counts.upcomingEvents", "Upcoming events"),
			href: "/hub/events",
			awaiting: false,
		},
		// A counter reading zero is noise, and the page behind it would be empty.
		// The queries above are disabled without the permission, so a count the
		// user may not see stays at 0 and the pill never appears.
	].filter((item) => item.count > 0);

	if (!counts.length) return null;

	return (
		<nav className={`${styles.counts}${className ? ` ${className}` : ""}`}>
			{counts.map((item) => (
				<Link
					key={item.key}
					href={item.href}
					className={styles.pill}
					data-awaiting={item.awaiting ? "true" : "false"}
				>
					<span className={styles.text}>
						<span className={styles.count}>{item.count}</span>
						<span className={styles.label}>{item.label}</span>
					</span>
					<IconChevronRight size={14} className={styles.chevron} aria-hidden />
				</Link>
			))}
		</nav>
	);
}

export default HubQuickCounts;
