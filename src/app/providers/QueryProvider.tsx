"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { type ReactNode, useState } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
	// Without a staleTime every mount and every window focus refetches, so the
	// same list is pulled several times per navigation. A minute of staleness is
	// fine for the feeds, and anything that must be fresh after a mutation is
	// invalidated explicitly.
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 60_000,
						gcTime: 5 * 60_000,
						refetchOnWindowFocus: false,
						retry: 1,
					},
				},
			}),
	);

	return (
		<QueryClientProvider client={queryClient}>
			{children}
			{process.env.NODE_ENV === "development" && (
				<ReactQueryDevtools
					initialIsOpen={false}
					buttonPosition="bottom-left"
				/>
			)}
		</QueryClientProvider>
	);
}
