import { beforeEach, describe, expect, it, vi } from "vitest";

const getAnalytics = vi.fn();
let consent = false;

vi.mock("@firebase/app", () => ({
	getApps: () => [],
	initializeApp: () => ({ name: "app" }),
}));
vi.mock("firebase/analytics", () => ({
	getAnalytics: (...args: unknown[]) => getAnalytics(...args),
}));
vi.mock("@/helpers/googleConsent", () => ({
	hasGoogleConsent: () => consent,
}));

async function bootFirebase() {
	vi.resetModules();
	const { getFirebaseApp } = await import("@/lib/firebase");
	getFirebaseApp();
	await vi.dynamicImportSettled();
}

describe("Firebase analytics and cookie consent", () => {
	beforeEach(() => {
		getAnalytics.mockReset();
		vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "key");
		vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "project");
		vi.stubEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "sender");
		vi.stubEnv("NEXT_PUBLIC_FIREBASE_APP_ID", "app");
	});

	it("stays off without Google consent", async () => {
		consent = false;
		await bootFirebase();
		expect(getAnalytics).not.toHaveBeenCalled();
	});

	it("starts once the user has consented", async () => {
		consent = true;
		await bootFirebase();
		expect(getAnalytics).toHaveBeenCalledWith({ name: "app" });
	});
});
