import type { ContentViewSubject } from "@gdhub-io/gdhub-prisma";
import { gtmEventTrigger } from "@/helpers/gtm";
import {
	CONTENT_VIEW_BATCH_MAX,
	type ContentViewSource,
} from "@/types/content-views";

/**
 * The client half of the view counter: decide once that something was seen, then
 * tell both sinks about it.
 *
 * Our own endpoint keeps the number under the card — deduplicated, immediate, and
 * unaffected by ad blockers. Google Tag Manager gets the same moment as an event
 * so the data can be sliced in GA4 by source, page or campaign. The two will not
 * agree: GTM only loads once cookies are accepted and is blocked for a good share
 * of visitors, so GA is always the smaller number. That is the trade, not a bug.
 *
 * `fetch` rather than the app's usual axios layer: only `sendBeacon` and
 * `keepalive` survive the page being closed, which is exactly when the last batch
 * would otherwise be lost.
 */

const ENDPOINT = "/api/content-views";
const FLUSH_DELAY_MS = 3000;

type PendingBatch = {
	subject: ContentViewSubject;
	source: ContentViewSource;
	ids: Set<string>;
};

/** Pending ids, grouped by the request they will become. */
const pending = new Map<string, PendingBatch>();
/** Everything already counted in this page session, so scrolling back is free. */
const counted = new Set<string>();

let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listening = false;

const send = (batch: PendingBatch, viaBeacon: boolean) => {
	const payload = JSON.stringify({
		subject: batch.subject,
		ids: [...batch.ids],
		source: batch.source,
	});
	const blob = new Blob([payload], { type: "application/json" });

	if (viaBeacon && navigator.sendBeacon?.(ENDPOINT, blob)) return;

	void fetch(ENDPOINT, {
		method: "POST",
		body: blob,
		keepalive: true,
		headers: { "Content-Type": "application/json" },
	}).catch(() => {
		// A lost view is a lost view. Nothing on screen depends on it.
	});
};

const flush = (viaBeacon = false) => {
	if (flushTimer) {
		clearTimeout(flushTimer);
		flushTimer = null;
	}

	if (pending.size === 0) return;

	const batches = [...pending.values()];
	pending.clear();

	for (const batch of batches) send(batch, viaBeacon);
};

/**
 * Closing the tab is the most common way a batch dies, and `visibilitychange` is
 * the last event that reliably fires on mobile — `pagehide` covers the Safari
 * back/forward cache on top of it.
 */
const listen = () => {
	if (listening) return;
	listening = true;

	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "hidden") flush(true);
	});
	window.addEventListener("pagehide", () => flush(true));
};

/** Counts one piece of content as seen, at most once per page session. */
export const queueContentView = (
	subject: ContentViewSubject,
	id: string,
	source: ContentViewSource,
) => {
	if (typeof window === "undefined") return;

	const seen = `${subject}:${id}:${source}`;
	if (counted.has(seen)) return;
	counted.add(seen);

	gtmEventTrigger("content_view", {
		subject_type: subject,
		subject_id: id,
		source,
	});

	const key = `${subject}:${source}`;
	const batch = pending.get(key) ?? { subject, source, ids: new Set<string>() };
	batch.ids.add(id);
	pending.set(key, batch);

	listen();

	// Flushing at the cap is what keeps a batch within the size the endpoint
	// accepts — nothing downstream has to slice it up again.
	if (batch.ids.size >= CONTENT_VIEW_BATCH_MAX) {
		flush();
		return;
	}

	flushTimer ??= setTimeout(flush, FLUSH_DELAY_MS);
};
