import { env } from "@/helpers/env";
import { cacheDelete, cacheGet, cacheSet } from "@/services/cache";

/**
 * Matrix access tokens for platform users.
 *
 * Two ways to mint one, in order of preference:
 *
 * 1. **Application service login** (`MATRIX_CHAT_APPSERVICE_TOKEN` set) —
 *    `POST /_matrix/client/v3/login` with `m.login.application_service`.
 *    Produces a REAL device: it shows up in `/devices`, `/logout` revokes it,
 *    and the `device_id` we ask for is the one the homeserver records.
 *    Requires the appservice registration on the homeserver, see
 *    docs/chat-system.md §7.
 * 2. **Admin login** (legacy fallback) — `POST /_synapse/admin/v1/users/{id}/login`.
 *    Synapse ignores `device_id` there, the response carries no device, and by
 *    default the token NEVER expires. We at least bound it with
 *    `valid_until_ms`. Delete this path once the registration is live.
 *
 * Tokens are cached in Redis per (user, device): without it every request
 * would mint another credential, and a second tab would get a different token
 * for the same browser.
 */

export type MatrixUserToken = {
	accessToken: string;
	deviceId: string;
	userId: string;
};

/** Appservice tokens live until an explicit logout; the cache just bounds staleness. */
const APPSERVICE_TTL_SECONDS = 30 * 24 * 60 * 60;
/** Admin-login tokens carry `valid_until_ms`; the cache expires slightly earlier. */
const ADMIN_TOKEN_TTL_SECONDS = 12 * 60 * 60;
const ADMIN_TOKEN_SKEW_SECONDS = 5 * 60;

function tokenCacheKey(localpart: string, deviceId: string) {
	return `matrix:token:${localpart}:${deviceId}`;
}

function appserviceToken(): string {
	return env("MATRIX_CHAT_APPSERVICE_TOKEN", "");
}

async function appserviceLogin(
	userId: string,
	deviceId: string,
): Promise<MatrixUserToken> {
	const BASE_URL = env("MATRIX_CHAT_BASE_URL");

	const resp = await fetch(`${BASE_URL}/_matrix/client/v3/login`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${appserviceToken()}`,
		},
		body: JSON.stringify({
			type: "m.login.application_service",
			identifier: { type: "m.id.user", user: userId },
			device_id: deviceId,
			initial_device_display_name: "GDHub Web",
		}),
	});

	if (!resp.ok) {
		const text = await resp.text();
		throw new Error(`Failed to log in as ${userId}: ${resp.status} ${text}`);
	}

	const data = (await resp.json()) as {
		access_token: string;
		device_id?: string;
		user_id?: string;
	};

	return {
		accessToken: data.access_token,
		deviceId: data.device_id || deviceId,
		userId: data.user_id || userId,
	};
}

async function adminLogin(
	userId: string,
	deviceId: string,
): Promise<MatrixUserToken> {
	const BASE_URL = env("MATRIX_CHAT_BASE_URL");
	const ADMIN_TOKEN = env("MATRIX_CHAT_SYNAPSE_ADMIN_TOKEN");

	const resp = await fetch(
		`${BASE_URL}/_synapse/admin/v1/users/${encodeURIComponent(userId)}/login`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${ADMIN_TOKEN}`,
			},
			body: JSON.stringify({
				valid_until_ms: Date.now() + ADMIN_TOKEN_TTL_SECONDS * 1000,
			}),
		},
	);

	if (!resp.ok) {
		const text = await resp.text();
		throw new Error(`Failed to get matrix token: ${resp.status} ${text}`);
	}

	const data = (await resp.json()) as { access_token: string };

	// No device is created by this endpoint — the id is ours alone, and only
	// the SDK on the other end ever sees it.
	return { accessToken: data.access_token, deviceId, userId };
}

/**
 * A usable access token for a platform user, reused across requests and tabs.
 * Pass the browser's own device id for a web session and a dedicated one for
 * background work: a device is the unit of revocation, so the two must not
 * share one.
 */
export async function getMatrixUserToken(
	platformUserId: string,
	deviceId?: string,
): Promise<MatrixUserToken> {
	const DOMAIN = env("MATRIX_CHAT_HOMESERVER_DOMAIN");
	const userId = `@${platformUserId}:${DOMAIN}`;
	const desiredDeviceId = deviceId || `web_${platformUserId}`;
	const key = tokenCacheKey(platformUserId, desiredDeviceId);

	const cachedToken = await cacheGet<MatrixUserToken>(key);
	if (cachedToken) return cachedToken;

	const usingAppservice = !!appserviceToken();
	const token = usingAppservice
		? await appserviceLogin(userId, desiredDeviceId)
		: await adminLogin(userId, desiredDeviceId);

	await cacheSet(
		key,
		token,
		usingAppservice
			? APPSERVICE_TTL_SECONDS
			: ADMIN_TOKEN_TTL_SECONDS - ADMIN_TOKEN_SKEW_SECONDS,
	);

	return token;
}

/** Drop a cached token without touching the homeserver (e.g. after a 401). */
export async function forgetMatrixUserToken(
	platformUserId: string,
	deviceId: string,
): Promise<void> {
	await cacheDelete(tokenCacheKey(platformUserId, deviceId));
}

/**
 * End a Matrix session for good: revoke the token on the homeserver and drop
 * it from the cache. Best-effort — a failed revoke must not block sign-out.
 *
 * `accessToken` is the one the browser actually holds. Revocation must not
 * hinge on the cache: an evicted key or an unreachable Redis would otherwise
 * leave a live credential behind — the exact thing this exists to prevent.
 */
export async function revokeMatrixUserToken(
	platformUserId: string,
	deviceId: string,
	accessToken?: string,
): Promise<void> {
	const BASE_URL = env("MATRIX_CHAT_BASE_URL");
	const key = tokenCacheKey(platformUserId, deviceId);

	const cachedToken = await cacheGet<MatrixUserToken>(key);
	await cacheDelete(key);

	const token = accessToken || cachedToken?.accessToken;
	if (!token) return;

	const resp = await fetch(`${BASE_URL}/_matrix/client/v3/logout`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: "{}",
	});

	// An already-invalid token is the outcome we wanted anyway.
	if (!resp.ok && resp.status !== 401) {
		const text = await resp.text();
		throw new Error(`Failed to log out: ${resp.status} ${text}`);
	}
}
