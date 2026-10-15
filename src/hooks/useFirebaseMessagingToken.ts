"use client";

import { useQuery } from "@tanstack/react-query";

type FirebaseMessagingState = {
	token: string | null;
	isSupported: boolean;
	permissionState: NotificationPermission;
	error: Error | null;
	ready: boolean;
};

const SERVICE_WORKER_PATH = "/matrix-push-sw.js";

const initialState: FirebaseMessagingState = {
	token: null,
	isSupported: false,
	permissionState: "default",
	error: null,
	ready: false,
};

async function bootstrapMessaging(): Promise<FirebaseMessagingState> {
	const state = { ...initialState, ready: true };

	try {
		// Loaded on demand so Firebase stays out of the bundle of every page.
		const [{ getMessaging, getToken, isSupported }, { getFirebaseApp }] =
			await Promise.all([
				import("@firebase/messaging"),
				import("@/lib/firebase"),
			]);

		state.isSupported = await isSupported();
		if (!state.isSupported || typeof Notification === "undefined") {
			return state;
		}

		let permission = Notification.permission;
		if (permission === "default") {
			permission = await Notification.requestPermission();
		}
		state.permissionState = permission;
		if (permission !== "granted") return state;

		const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
		if (!vapidKey) throw new Error("Firebase VAPID key is not configured");

		const serviceWorkerRegistration =
			await navigator.serviceWorker.register(SERVICE_WORKER_PATH);
		state.token = await getToken(getMessaging(getFirebaseApp()), {
			vapidKey,
			serviceWorkerRegistration,
		});
	} catch (error) {
		if (error instanceof Error) state.error = error;
	}

	return state;
}

// One bootstrap per tab, shared by the chat and the notification bell.
export function useFirebaseMessagingToken(): FirebaseMessagingState {
	const { data } = useQuery({
		queryKey: ["fcm-token"],
		queryFn: bootstrapMessaging,
		staleTime: Number.POSITIVE_INFINITY,
		retry: false,
	});

	return data ?? initialState;
}
