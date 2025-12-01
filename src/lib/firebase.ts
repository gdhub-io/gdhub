import { type FirebaseApp, getApps, initializeApp } from "@firebase/app";
import { getAnalytics } from "firebase/analytics";

type FirebaseClientConfig = {
	apiKey: string;
	authDomain?: string;
	projectId: string;
	messagingSenderId: string;
	appId: string;
	measurementId?: string;
};

let firebaseApp: FirebaseApp | null = null;

function createFirebaseConfig(): FirebaseClientConfig {
	const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
	const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
	const messagingSenderId =
		process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
	const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

	if (!apiKey || !projectId || !messagingSenderId || !appId) {
		throw new Error("Firebase client configuration is incomplete");
	}

	return {
		apiKey,
		projectId,
		messagingSenderId,
		appId,
		authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
		measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
	};
}

export function getFirebaseApp(): FirebaseApp {
	if (firebaseApp) {
		return firebaseApp;
	}

	const existingApp = getApps()[0];
	if (existingApp) {
		firebaseApp = existingApp;
		return firebaseApp;
	}

	firebaseApp = initializeApp(createFirebaseConfig());
	getAnalytics(firebaseApp);

	return firebaseApp;
}
