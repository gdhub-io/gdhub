import type {
	CheckpointEvent,
	CheckpointEvents,
} from "@/config/analytics-events";

declare global {
	interface Window {
		dataLayer: any[];
	}
}

export const GTM_ID = process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID || "";

export const pageview = (url: string) => {
	if (typeof window !== "undefined" && Array.isArray(window.dataLayer)) {
		window.dataLayer.push({
			event: "page_view",
			page: url,
			timestamp: new Date().toISOString(),
		});
	}
};

export const gtmEventTrigger = (event: string, data: Record<string, any>) => {
	if (typeof window !== "undefined" && Array.isArray(window.dataLayer)) {
		window.dataLayer.push({
			event,
			[event]: data,
			timestamp: new Date().toISOString(),
		});
	}
};

const fired = new Set<string>();
const ONCE_PREFIX = "gd.cp.once.";

/** True the first time a key is claimed; with `persist`, the first time in this browser. */
const claimOnce = (key: string, persist: boolean) => {
	if (fired.has(key)) return false;
	fired.add(key);
	if (!persist) return true;
	try {
		if (window.localStorage.getItem(ONCE_PREFIX + key) !== null) return false;
		window.localStorage.setItem(ONCE_PREFIX + key, "1");
	} catch {}
	return true;
};

/**
 * Pushes a checkpoint funnel event flat — `{ event, ...params }` — so GTM reads
 * each param by name. `once` keeps a moment from firing again on a re-render or
 * refetch; with `persist` it survives a reload too. `callback` runs when GTM has
 * taken the event (at most a second later), or straight away when nothing is pushed.
 */
export const trackCheckpoint = <E extends CheckpointEvent>(
	event: E,
	params: CheckpointEvents[E],
	{
		once,
		persist = false,
		callback,
	}: { once?: string; persist?: boolean; callback?: () => void } = {},
) => {
	const push =
		typeof window !== "undefined" &&
		(!once || claimOnce(once, persist)) &&
		Array.isArray(window.dataLayer);
	if (!push) {
		callback?.();
		return;
	}

	if (!callback) {
		window.dataLayer.push({ event, ...params });
		return;
	}
	let done = false;
	const finish = () => {
		if (done) return;
		done = true;
		callback();
	};
	window.dataLayer.push({ event, ...params, eventCallback: finish });
	// A dataLayer with no GTM behind it (blocked, or consent not given) never calls back.
	window.setTimeout(finish, 1000);
};

const SIGNIN_FLAG = "gd.cp.signin";
const SIGNIN_FLAG_TTL = 24 * 60 * 60 * 1000;
type SigninProvider = CheckpointEvents["checkpoint_signed_in"]["provider"];

/**
 * Marks a sign-in started on the way to a checkpoint. localStorage, not
 * sessionStorage: a magic link opens in a new tab. It lives as long as the link does.
 */
export const markCheckpointSignIn = (provider: SigninProvider) => {
	try {
		window.localStorage.setItem(
			SIGNIN_FLAG,
			JSON.stringify({ provider, at: Date.now() }),
		);
	} catch {}
};

/** The provider of a checkpoint sign-in that just finished, read once. */
export const takeCheckpointSignIn = (): SigninProvider | null => {
	try {
		const raw = window.localStorage.getItem(SIGNIN_FLAG);
		if (!raw) return null;
		window.localStorage.removeItem(SIGNIN_FLAG);
		const { provider, at } = JSON.parse(raw) as {
			provider: SigninProvider;
			at: number;
		};
		return Date.now() - at < SIGNIN_FLAG_TTL ? provider : null;
	} catch {
		return null;
	}
};
