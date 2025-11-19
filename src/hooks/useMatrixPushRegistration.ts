"use client";

import { useEffect, useRef } from "react";
import { registerMatrixPusher } from "@/helpers/matrix-pushers";
import type { MatrixChatSessionResponse } from "@/types/chat";

type UseMatrixPushRegistrationArgs = {
	session?: MatrixChatSessionResponse | null;
	subscription?: PushSubscriptionJSON | null;
	lang?: string | null;
	deviceDisplayName?: string;
};

export function useMatrixPushRegistration({
	session,
	subscription,
	lang,
	deviceDisplayName,
}: UseMatrixPushRegistrationArgs) {
	const registeringRef = useRef(false);

	useEffect(() => {
		const accessToken = session?.token;
		const deviceId = session?.deviceId;
		const pushKey = subscription?.endpoint;

		if (!accessToken || !deviceId || !pushKey) {
			return;
		}
		if (registeringRef.current) return;

		const cacheKey = `matrix-pusher:${deviceId}:${pushKey}`;
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
		session?.deviceId,
		session?.token,
		subscription,
		subscription?.endpoint,
	]);
}
