"use client";

import type { ContentViewSubject } from "@gdhub-io/gdhub-prisma";
import { useEffect, useRef } from "react";
import { queueContentView } from "@/lib/content-views";

/**
 * Half the card, for a whole second — the IAB viewable-impression rule the ad
 * industry settled on, and the reason scrolling past something does not count it.
 */
const VISIBLE_RATIO = 0.5;
const DWELL_MS = 1000;
const THRESHOLDS = [0, 0.25, VISIBLE_RATIO, 0.75, 1];

/** Where a tracked element says which content it stands for. */
const ID_ATTRIBUTE = "data-view-id";

/**
 * A card taller than the viewport can never reach half of itself on screen, so it
 * would never be counted. The same standard covers that case by asking instead
 * that it fill half the screen.
 */
const isSeen = (entry: IntersectionObserverEntry) =>
	entry.isIntersecting &&
	(entry.intersectionRatio >= VISIBLE_RATIO ||
		entry.intersectionRect.height >= window.innerHeight * VISIBLE_RATIO);

/**
 * Watches feed cards and counts the ones that were actually looked at.
 *
 * The state lives on an instance rather than in closures so `attach` can stay one
 * function for the tracker's whole life. React re-runs a ref callback whenever its
 * identity changes, and a per-render callback would cancel the dwell timer of the
 * very card the reader is looking at — silently, on every unrelated re-render.
 */
class FeedViewTracker {
	private observer: IntersectionObserver | null = null;
	/** On screen right now — the only ones worth re-checking after an alt-tab. */
	private readonly visible = new Set<Element>();
	private readonly timers = new Map<Element, ReturnType<typeof setTimeout>>();

	constructor(private readonly subject: ContentViewSubject) {}

	readonly attach = (element: HTMLElement | null) => {
		if (!element) return;

		const observer = this.getObserver();
		if (!observer) return;

		observer.observe(element);

		return () => {
			this.stopWaiting(element);
			this.visible.delete(element);
			observer.unobserve(element);
		};
	};

	readonly handleVisibilityChange = () => {
		if (document.visibilityState !== "visible") {
			this.clearTimers();
			return;
		}

		// Returning to the tab changes no intersection, so the observer stays silent
		// and whatever is on screen would go uncounted. Re-observing replays the
		// callback — for the handful of cards actually there, not the whole feed.
		for (const element of this.visible) {
			this.observer?.unobserve(element);
			this.observer?.observe(element);
		}
	};

	dispose() {
		this.clearTimers();
		this.visible.clear();
		this.observer?.disconnect();
		this.observer = null;
	}

	private getObserver() {
		if (this.observer) return this.observer;
		if (typeof IntersectionObserver === "undefined") return null;

		this.observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) this.handleEntry(entry);
			},
			{ threshold: THRESHOLDS },
		);

		return this.observer;
	}

	private handleEntry(entry: IntersectionObserverEntry) {
		const element = entry.target;
		const seen = isSeen(entry);

		if (seen) this.visible.add(element);
		else this.visible.delete(element);

		// A background tab reports its whole viewport as visible, which would count
		// the entire feed nobody is looking at.
		if (!seen || document.visibilityState !== "visible") {
			this.stopWaiting(element);
			return;
		}

		if (this.timers.has(element)) return;

		this.timers.set(
			element,
			setTimeout(() => this.count(element), DWELL_MS),
		);
	}

	private count(element: Element) {
		this.timers.delete(element);
		this.visible.delete(element);

		const id = element.getAttribute(ID_ATTRIBUTE);
		if (!id) return;

		queueContentView(this.subject, id, "feed");
		this.observer?.unobserve(element);
	}

	private stopWaiting(element: Element) {
		const timer = this.timers.get(element);
		if (timer === undefined) return;

		clearTimeout(timer);
		this.timers.delete(element);
	}

	private clearTimers() {
		for (const timer of this.timers.values()) clearTimeout(timer);
		this.timers.clear();
	}
}

/**
 * Counts feed cards that were looked at.
 *
 * Attach the returned ref to each card and name the content on it:
 * `<div ref={trackView} data-view-id={post.id}>`. Reading the id from the element
 * is what lets one unchanging callback serve every card.
 */
export function useFeedViews(subject: ContentViewSubject) {
	// `subject` is a constant at every call site, so the tracker is built once.
	const trackerRef = useRef<FeedViewTracker | null>(null);
	trackerRef.current ??= new FeedViewTracker(subject);

	const tracker = trackerRef.current;

	useEffect(() => {
		document.addEventListener(
			"visibilitychange",
			tracker.handleVisibilityChange,
		);

		return () => {
			document.removeEventListener(
				"visibilitychange",
				tracker.handleVisibilityChange,
			);
			tracker.dispose();
		};
	}, [tracker]);

	return tracker.attach;
}

/** Counts one look at a content page. Opening it is the whole condition. */
export function useContentPageView(
	subject: ContentViewSubject,
	id: string | undefined,
) {
	useEffect(() => {
		if (!id) return;

		queueContentView(subject, id, "page");
	}, [subject, id]);
}
