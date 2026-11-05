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

type Response = Awaited<ReturnType<typeof fetch>>;

/**
 * GET a link the author gave (or POST `json` to it), following at most three
 * redirects, each checked again. Resolves with the final 2xx response, its body
 * unread, or why not.
 */
async function safeGet(
	link: string,
	json?: unknown,
): Promise<
	| { ok: true; response: Response; url: URL }
	| { ok: false; reason: OpenFailure }
> {
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

		let response: Response;
		try {
			// undici's own fetch: the global one may be a different undici that
			// does not accept this dispatcher.
			response = await fetch(url, {
				redirect: "manual",
				signal: AbortSignal.timeout(TIMEOUT_MS),
				dispatcher: publicOnly,
				headers: {
					"user-agent": "GDHub artifact check",
					...(json !== undefined && { "content-type": "application/json" }),
				},
				...(json !== undefined && {
					method: "POST",
					body: JSON.stringify(json),
				}),
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

		const location = response.headers.get("location");
		if (response.status >= 300 && response.status < 400 && location) {
			await response.body?.cancel();
			url = new URL(location, url);
			continue;
		}
		if (response.ok) return { ok: true, response, url };
		await response.body?.cancel();
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

/**
 * Whether a link the author gave opens for an anonymous visitor. Only the
 * response head is read — the body is dropped unread, so a build is never
 * downloaded.
 */
export async function openLink(link: string): Promise<OpenResult> {
	const result = await safeGet(link);
	if (!result.ok) return result;
	await result.response.body?.cancel();
	return { ok: true };
}

type FetchedBody = {
	/** The content type the server named, without parameters. */
	contentType: string;
	bytes: Uint8Array;
	/** Where the redirects ended. */
	url: string;
};

/**
 * The body of a link, up to `maxBytes`. A larger body is not read past the cap
 * and comes back as `tooLarge` — the reader decides what that means.
 */
export async function fetchBody(
	link: string,
	maxBytes: number,
	/** Checked on the headers: a body of another type is never read. */
	accept?: (contentType: string) => boolean,
	/** Sent as a JSON POST body instead of a GET. */
	json?: unknown,
): Promise<
	| { ok: true; body: FetchedBody }
	| { ok: false; reason: OpenFailure | "tooLarge" | "notAccepted" }
> {
	const result = await safeGet(link, json);
	if (!result.ok) return result;
	const { response, url } = result;

	const contentType = (response.headers.get("content-type") ?? "")
		.split(";")[0]
		.trim()
		.toLowerCase();
	if (accept && !accept(contentType)) {
		await response.body?.cancel();
		return { ok: false, reason: "notAccepted" };
	}

	const declared = Number(response.headers.get("content-length") ?? 0);
	if (declared > maxBytes) {
		await response.body?.cancel();
		return { ok: false, reason: "tooLarge" };
	}

	const chunks: Uint8Array[] = [];
	let size = 0;
	for await (const chunk of response.body ?? []) {
		size += chunk.byteLength;
		if (size > maxBytes) {
			await response.body?.cancel().catch(() => {});
			return { ok: false, reason: "tooLarge" };
		}
		chunks.push(chunk);
	}

	const bytes = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}

	return {
		ok: true,
		body: {
			contentType,
			bytes,
			url: url.toString(),
		},
	};
}
