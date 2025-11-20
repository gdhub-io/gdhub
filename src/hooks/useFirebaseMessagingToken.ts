"use client";

import {
	getMessaging,
	getToken,
	isSupported as isMessagingSupported,
	type Messaging,
} from "@firebase/messaging";
import { useEffect, useMemo, useState } from "react";
import { getFirebaseApp } from "@/lib/firebase";

type FirebaseMessagingState = {
	token: string | null;
	isSupported: boolean;
	permissionState: NotificationPermission;
	error: Error | null;
	ready: boolean;
};

type UseFirebaseMessagingTokenOptions = {
	serviceWorkerPath?: string;
	vapidKey?: string;
};

const DEFAULT_SW_PATH = "/matrix-push-sw.js";

function assertVapidKey(override?: string): string {
	const key = override || process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
	if (!key) {
		throw new Error("Firebase VAPID key is not configured");
	}
	return key;
}

function getClientMessaging(): Messaging {
	return getMessaging(getFirebaseApp());
}

export function useFirebaseMessagingToken(
	options: UseFirebaseMessagingTokenOptions = {},
): FirebaseMessagingState {
	const [token, setToken] = useState<string | null>(null);
	const [permissionState, setPermissionState] =
		useState<NotificationPermission>("default");
	const [error, setError] = useState<Error | null>(null);
	const [ready, setReady] = useState(false);

	const isBrowser = typeof window !== "undefined";

	const [isSupported, setIsSupported] = useState(false);

	useEffect(() => {
		let cancelled = false;

		if (!isBrowser) {
			setReady(true);
			return;
		}

		async function bootstrap() {
			try {
				const supported = await isMessagingSupported();
				if (cancelled) return;
				setIsSupported(supported);

				if (!supported || typeof Notification === "undefined") {
					return;
				}

				let permission = Notification.permission;
				if (permission === "default") {
					permission = await Notification.requestPermission();
				}
				if (cancelled) return;
				setPermissionState(permission);

				if (permission !== "granted") {
					return;
				}

				const swRegistration = await navigator.serviceWorker.register(
					options.serviceWorkerPath || DEFAULT_SW_PATH,
				);

				const vapidKey = assertVapidKey(options.vapidKey);
				const messaging = getClientMessaging();
				const messagingToken = await getToken(messaging, {
					vapidKey,
					serviceWorkerRegistration: swRegistration,
				});

				if (!cancelled) {
					setToken(messagingToken);
				}
			} catch (err) {
				if (!cancelled && err instanceof Error) {
					setError(err);
				}
			} finally {
				if (!cancelled) {
					setReady(true);
				}
			}
		}

		void bootstrap();

		return () => {
			cancelled = true;
		};
	}, [isBrowser, options.serviceWorkerPath, options.vapidKey]);

	return useMemo(
		() => ({
			token,
			isSupported,
			permissionState,
			error,
			ready,
		}),
		[token, isSupported, permissionState, error, ready],
	);
}
