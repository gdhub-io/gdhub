"use client";

import { useEffect, useMemo, useState } from "react";
import { urlBase64ToUint8Array } from "@/helpers/web-push";

type SubscriptionState = {
	subscription: PushSubscriptionJSON | null;
	isSupported: boolean;
	permissionState: NotificationPermission;
	error: Error | null;
	ready: boolean;
};

type UseWebPushSubscriptionOptions = {
	serviceWorkerPath?: string;
	applicationServerKey?: string;
};

const DEFAULT_SW_PATH = "/matrix-push-sw.js";

export function useWebPushSubscription(
	options: UseWebPushSubscriptionOptions = {},
): SubscriptionState {
	const [subscription, setSubscription] = useState<PushSubscriptionJSON | null>(
		null,
	);
	const [permissionState, setPermissionState] =
		useState<NotificationPermission>(
			typeof window === "undefined" || typeof Notification === "undefined"
				? "default"
				: Notification.permission,
		);
	const [error, setError] = useState<Error | null>(null);
	const [ready, setReady] = useState(false);

	const isSupported = useMemo(() => {
		if (typeof window === "undefined") return false;
		return (
			"serviceWorker" in navigator &&
			"PushManager" in window &&
			"Notification" in window
		);
	}, []);

	useEffect(() => {
		if (!isSupported) return;
		let cancelled = false;

		async function bootstrap() {
			try {
				const swPath = options.serviceWorkerPath || DEFAULT_SW_PATH;
				const registration = await navigator.serviceWorker.register(swPath);

				let permission = Notification.permission;
				if (permission === "default") {
					permission = await Notification.requestPermission();
				}
				if (cancelled) return;
				setPermissionState(permission);

				if (permission !== "granted") {
					setReady(true);
					return;
				}

				const existing = await registration.pushManager.getSubscription();
				if (existing) {
					setSubscription(existing.toJSON());
					setReady(true);
					return;
				}

				const publicKey =
					options.applicationServerKey ||
					process.env.NEXT_PUBLIC_MATRIX_WEB_PUSH_PUBLIC_KEY;

				if (!publicKey) {
					throw new Error(
						"MISSING_PUBLIC_KEY: NEXT_PUBLIC_MATRIX_WEB_PUSH_PUBLIC_KEY is not set",
					);
				}

				const serverKey = urlBase64ToUint8Array(publicKey);
				const pushSubscription = await registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: serverKey,
				});

				if (!cancelled) {
					setSubscription(pushSubscription.toJSON());
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

		bootstrap();

		return () => {
			cancelled = true;
		};
	}, [isSupported, options.applicationServerKey, options.serviceWorkerPath]);

	return {
		subscription,
		isSupported,
		permissionState,
		error,
		ready,
	};
}
