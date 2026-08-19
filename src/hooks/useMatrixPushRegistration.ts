"use client";

import { useEffect, useRef } from "react";
import { pusherCacheKey, registerMatrixPusher } from "@/helpers/matrix-pushers";
import type { MatrixChatSessionResponse } from "@/types/chat";

type UseMatrixPushRegistrationArgs = {
	session?: MatrixChatSessionResponse | null;
	subscription?: PushSubscriptionJSON | null;
	pushKey?: string | null;
	lang?: string | null;
	deviceDisplayName?: string;
};

export function useMatrixPushRegistration({
	session,
	subscription,
	pushKey: explicitPushKey,
	lang,
	deviceDisplayName,
}: UseMatrixPushRegistrationArgs) {
	const registeringRef = useRef(false);

	useEffect(() => {
		const accessToken = session?.token;
		const deviceId = session?.deviceId;
		const userId = session?.userId;
		const pushKey = explicitPushKey || subscription?.endpoint;

		if (!accessToken || !deviceId || !userId || !pushKey) {
			return;
		}
		if (registeringRef.current) return;

		const cacheKey = pusherCacheKey(userId, deviceId, pushKey);
		if (typeof window !== "undefined" && localStorage.getItem(cacheKey)) {
			return;
		}

		registeringRef.current = true;

		registerMatrixPusher({
			accessToken,
			deviceId,
			pushKey,
			lang,
			deviceDisplayName,
			subscription,
		})
			.then(() => {
				if (typeof window !== "undefined") {
					localStorage.setItem(cacheKey, new Date().toISOString());
				}
			})
			.catch((error) => {
				console.error("[matrix] failed to register pusher", error);
			})
			.finally(() => {
				registeringRef.current = false;
			});
	}, [
		deviceDisplayName,
		lang,
		explicitPushKey,
		session?.deviceId,
		session?.token,
		session?.userId,
		subscription,
		subscription?.endpoint,
	]);
}
