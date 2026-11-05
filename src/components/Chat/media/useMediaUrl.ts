import { useEffect, useState } from "react";
import { type Thumbnail, useChatMediaLoaders } from "./loaders";

type Entry = { promise: Promise<string>; url?: string; refs: number };

/** Blob URLs nobody shows any more, kept for scrolling back before being revoked. */
const IDLE_LIMIT = 60;

const cache = new Map<string, Entry>();

function prune() {
	let idle = [...cache.values()].filter((entry) => entry.refs === 0).length;
	for (const [key, entry] of cache) {
		if (idle <= IDLE_LIMIT) break;
		if (entry.refs > 0 || !entry.url) continue;
		URL.revokeObjectURL(entry.url);
		cache.delete(key);
		idle--;
	}
}

function acquire(key: string, load: () => Promise<Blob>): Entry {
	let entry = cache.get(key);
	if (entry) {
		// Re-insert: Map order doubles as least-recently-used order.
		cache.delete(key);
	} else {
		const created: Entry = {
			refs: 0,
			promise: load().then((blob) => {
				created.url = URL.createObjectURL(blob);
				return created.url;
			}),
		};
		// A failure is not cached: the next mount tries again.
		created.promise.catch(() => {
			if (cache.get(key) === created) cache.delete(key);
		});
		entry = created;
	}
	cache.set(key, entry);
	entry.refs++;
	return entry;
}

function release(key: string, entry: Entry) {
	entry.refs--;
	if (entry.refs > 0) return;
	// Originals run to 10 MB each: free them with the viewer, keep only thumbnails.
	if (key.endsWith("|full") && entry.url) {
		URL.revokeObjectURL(entry.url);
		cache.delete(key);
		return;
	}
	prune();
}

export type MediaState =
	| { status: "loading"; url?: undefined }
	| { status: "ready"; url: string }
	| { status: "error"; url?: undefined };

/**
 * An authenticated `mxc://` resource as a blob URL, shared per URI and size.
 * Pass null to load nothing (e.g. the full image until the viewer opens).
 */
export function useMediaUrl(
	mxc: string | null | undefined,
	thumbnail?: Thumbnail,
): MediaState {
	const loaders = useChatMediaLoaders();
	const key = mxc
		? `${mxc}|${thumbnail ? `${thumbnail.width}x${thumbnail.height}` : "full"}`
		: null;
	const [state, setState] = useState<MediaState>(() => {
		const url = key ? cache.get(key)?.url : undefined;
		return url ? { status: "ready", url } : { status: "loading" };
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: `key` already encodes mxc and thumbnail
	useEffect(() => {
		if (!key || !mxc || !loaders) return;
		const entry = acquire(key, () => loaders.loadMedia(mxc, thumbnail));
		let live = true;
		if (entry.url) setState({ status: "ready", url: entry.url });
		else setState({ status: "loading" });
		entry.promise.then(
			(url) => live && setState({ status: "ready", url }),
			() => live && setState({ status: "error" }),
		);
		return () => {
			live = false;
			release(key, entry);
		};
	}, [key, loaders]);

	return state;
}
