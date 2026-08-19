const PUSHER_CACHE_PREFIX = "matrix-pusher:";

/**
 * Registration bookkeeping is per ACCOUNT, not just per device: the device id
 * and the FCM token both survive a sign-out, so a key without the user would
 * tell the next account on this browser that its pusher is already registered
 * while the pusher still points at the previous one.
 */
export function pusherCacheKey(
	userId: string,
	deviceId: string,
	pushKey: string,
) {
	return `${PUSHER_CACHE_PREFIX}${userId}:${deviceId}:${pushKey}`;
}

export function clearPusherCache() {
	if (typeof window === "undefined") return;

	for (const key of Object.keys(window.localStorage)) {
		if (key.startsWith(PUSHER_CACHE_PREFIX)) {
			window.localStorage.removeItem(key);
		}
	}
}

type RegisterMatrixPusherArgs = {
	accessToken: string;
	deviceId: string;
	pushKey: string;
	lang?: string | null;
	deviceDisplayName?: string;
	subscription?: PushSubscriptionJSON | null;
};

export async function registerMatrixPusher({
	accessToken,
	deviceId,
	pushKey,
	lang,
	deviceDisplayName,
	subscription,
}: RegisterMatrixPusherArgs) {
	const baseUrl = process.env.NEXT_PUBLIC_MATRIX_CHAT_BASE_URL;
	const gatewayUrl = process.env.NEXT_PUBLIC_MATRIX_PUSH_GATEWAY_URL;
	const appId = process.env.NEXT_PUBLIC_MATRIX_PUSH_APP_ID;
	const appDisplayName =
		process.env.NEXT_PUBLIC_MATRIX_PUSH_APP_DISPLAY_NAME || "GDHub Chat";
	const format = process.env.NEXT_PUBLIC_MATRIX_PUSH_FORMAT || "event_id_only";
	const kind = process.env.NEXT_PUBLIC_MATRIX_PUSH_KIND || "http";

	if (!baseUrl || !gatewayUrl || !appId) {
		throw new Error("Matrix push configuration is incomplete");
	}

	const subscriptionEndpoint = subscription?.endpoint;
	const subscriptionP256dh = subscription?.keys?.p256dh;
	const subscriptionAuth = subscription?.keys?.auth;

	const payload = {
		// For WebPush pushers, Synapse/Sygnal expect endpoint, p256dh and auth
		// to be provided explicitly. We keep pushKey (endpoint) for Matrix,
		// but also flatten subscription details into data.
		pushkey: pushKey,
		kind,
		app_id: appId,
		app_display_name: appDisplayName,
		device_display_name:
			deviceDisplayName ||
			(typeof navigator !== "undefined" ? navigator.userAgent : "Web"),
		lang:
			lang || (typeof navigator !== "undefined" ? navigator.language : "en"),
		// `pushers/set` has no device field — the token's device owns the pusher.
		profile_tag: deviceId.slice(-8),
		append: false,
		data: {
			url: gatewayUrl,
			format,
			endpoint: subscriptionEndpoint,
			p256dh: subscriptionP256dh,
			auth: subscriptionAuth,
		},
	};

	const response = await fetch(`${baseUrl}/_matrix/client/v3/pushers/set`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${accessToken}`,
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		const message = await response.text();
		throw new Error(
			`Failed to register Matrix pusher: ${response.status} ${message}`,
		);
	}
}
