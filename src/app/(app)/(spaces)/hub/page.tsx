import {
	dehydrate,
	HydrationBoundary,
	QueryClient,
} from "@tanstack/react-query";
import type { Metadata } from "next";
import { getSession } from "@/auth";
import { DEVLOG_FEED_LIMIT, devlogFeedQueryKey } from "@/config/devlog-feed";
import { getDevlogFeedPage } from "@/repositories/devlog-feed";
import HubClient from "./HubClient";

export const metadata: Metadata = {
	title: "Hub",
	robots: { index: false, follow: false },
	alternates: { canonical: "/hub" },
	openGraph: { type: "website", url: "/hub", title: "Hub" },
};

/**
 * The feed is the hub's largest element, so it decides the page's LCP. Fetched
 * from the browser it could not start before the bundle had downloaded, run and
 * queued a request behind every other call the shell makes — around four
 * seconds on a mid-tier connection. Prefetching it here puts the first page of
 * posts, and the covers they point at, in the HTML.
 */
export default async function HubPage() {
	const session = await getSession();
	const showFeed = Boolean(session?.user?.onboardingDone);

	const queryClient = new QueryClient();

	if (showFeed) {
		await queryClient.prefetchInfiniteQuery({
			queryKey: devlogFeedQueryKey(),
			queryFn: () => getDevlogFeedPage({ limit: DEVLOG_FEED_LIMIT }),
			initialPageParam: null,
		});
	}

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<HubClient feedVisible={showFeed} />
		</HydrationBoundary>
	);
}
