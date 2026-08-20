/** Where a viewer met the content. Mirrors a row's `fromFeed` / `fromPage`. */
export const CONTENT_VIEW_SOURCES = ["feed", "page"] as const;

export type ContentViewSource = (typeof CONTENT_VIEW_SOURCES)[number];

/**
 * The most ids one request may carry.
 *
 * Shared between the client's batch size and the server's validation so the two
 * cannot drift: raising only the cap wastes requests, lowering only the cap turns
 * every full flush into a silent 400.
 */
export const CONTENT_VIEW_BATCH_MAX = 50;
