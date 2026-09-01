/** How many posts the hub feed asks for per page. */
export const DEVLOG_FEED_LIMIT = 5;

/**
 * Shared between the server prefetch and the client's `useInfiniteQuery`. The
 * `?? null` matters: `undefined` inside a key hashes differently on either side,
 * and the hub would refetch the page it was just handed.
 */
export const devlogFeedQueryKey = (projectId?: string | null) =>
	["devlog-posts", projectId ?? null] as const;
