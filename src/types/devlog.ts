/** Shape returned by `GET /api/devlogs` — keyset page, not offset. */
export type DevlogFeedPage<TItem> = {
	items: TItem[];
	/** Feed into the next request's `after`. `null` once the feed is exhausted. */
	nextCursor: string | null;
	hasMore: boolean;
};
