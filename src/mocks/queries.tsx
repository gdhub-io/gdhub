import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

type Seed =
	| { key: unknown[]; data: unknown }
	| { key: unknown[]; state: "pending" | "error" };

/**
 * Seeds TanStack queries for a story — data, a load that never ends,
 * or a failure — and keeps them from fetching on mount.
 */
export function withQueries(...seeds: Seed[]) {
	const client = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				retryOnMount: false,
				refetchOnMount: false,
				staleTime: Number.POSITIVE_INFINITY,
			},
		},
	});

	for (const seed of seeds) {
		if ("data" in seed) {
			client.setQueryData(seed.key, seed.data);
			continue;
		}
		client
			.getQueryCache()
			.build(client, { queryKey: seed.key })
			.setState(
				seed.state === "error"
					? { status: "error", error: new Error("story"), fetchStatus: "idle" }
					: { status: "pending", fetchStatus: "fetching" },
			);
	}

	return (Story: () => ReactElement) => (
		<QueryClientProvider client={client}>
			<Story />
		</QueryClientProvider>
	);
}
