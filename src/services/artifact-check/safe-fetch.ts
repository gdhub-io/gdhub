import { lookup } from "node:dns";
import { lookup as resolve } from "node:dns/promises";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";
import { Agent, fetch } from "undici";

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8000;

/** Why a link did not open; stored as `ProjectArtifact.checkNote`. */
export type OpenFailure =
	| "unsafe"
	| "needsLogin"
	| "notFound"
	| "timeout"
	| "tooManyRedirects"
	| "unreachable";

export type OpenResult = { ok: true } | { ok: false; reason: OpenFailure };

class UnsafeAddressError extends Error {}

/** Only the public internet: no loopback, private, link-local or reserved ranges. */
export const isPublicAddress = (address: string) => {
	try {
		return ipaddr.process(address).range() === "unicast";
	} catch {
		return false;
	}
};

// Checked when the socket connects, so a name that resolves to a public address
// for the first lookup and a private one for the second (DNS rebinding) is
// still refused.
const publicOnly = new Agent({
	connect: {
		lookup(hostname, options, callback) {
			lookup(hostname, { ...options, all: true }, (error, addresses) => {
				if (error) return callback(error, []);
				const unsafe = addresses.find((a) => !isPublicAddress(a.address));
				if (unsafe) {
					return callback(new UnsafeAddressError(hostname), []);
				}
				callback(null, addresses);
			});
		},
	},
});

// Where an unauthenticated visitor lands instead of a private file or page.
const LOGIN_HOSTS = new Set([
	"accounts.google.com",
	"login.microsoftonline.com",
	"login.live.com",
]);
const LOGIN_PATH = /\/(login|signin|sign-in|auth)(\/|$|\?)/i;

const isLoginPage = (url: URL) =>
	LOGIN_HOSTS.has(url.hostname) || LOGIN_PATH.test(url.pathname);

const refusedAsUnsafe = (error: unknown): boolean => {
	for (let e: unknown = error; e instanceof Error; e = e.cause) {
		if (e instanceof UnsafeAddressError) return true;
	}
	return false;
};

/**
 * Whether a link the author gave opens for an anonymous visitor. Only the
 * response head is read — the body is dropped unread, so a build is never
 * downloaded.
 */
export async function openLink(link: string): Promise<OpenResult> {
	let url: URL;
	try {
		url = new URL(link);
	} catch {
		return { ok: false, reason: "unreachable" };
	}

	for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
		if (url.protocol !== "https:" && url.protocol !== "http:") {
			return { ok: false, reason: "unsafe" };
		}
		const host = url.hostname.replace(/^\[|\]$/g, "");
		const addresses = isIP(host)
			? [host]
			: await resolve(host, { all: true })
					.then((found) => found.map((a) => a.address))
					.catch(() => null);
		if (!addresses) return { ok: false, reason: "unreachable" };
		// Checked here as well as on connect: a runtime that ignores the agent's
		// lookup (Bun) must still never reach a private address.
		if (!addresses.every(isPublicAddress)) {
			return { ok: false, reason: "unsafe" };
		}
		if (isLoginPage(url)) return { ok: false, reason: "needsLogin" };

		let response: Awaited<ReturnType<typeof fetch>>;
		try {
			// undici's own fetch: the global one may be a different undici that
			// does not accept this dispatcher.
			response = await fetch(url, {
				redirect: "manual",
				signal: AbortSignal.timeout(TIMEOUT_MS),
				dispatcher: publicOnly,
				headers: { "user-agent": "GDHub artifact check" },
			});
		} catch (error) {
			if (refusedAsUnsafe(error)) {
				return { ok: false, reason: "unsafe" };
			}
			if (error instanceof DOMException && error.name === "TimeoutError") {
				return { ok: false, reason: "timeout" };
			}
			return { ok: false, reason: "unreachable" };
		}
		await response.body?.cancel();

		const location = response.headers.get("location");
		if (response.status >= 300 && response.status < 400 && location) {
			url = new URL(location, url);
			continue;
		}
		if (response.ok) return { ok: true };
		if (response.status === 401 || response.status === 403) {
			return { ok: false, reason: "needsLogin" };
		}
		if (response.status === 404 || response.status === 410) {
			return { ok: false, reason: "notFound" };
		}
		return { ok: false, reason: "unreachable" };
	}

	return { ok: false, reason: "tooManyRedirects" };
}
