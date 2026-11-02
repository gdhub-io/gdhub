import { defineConfig, devices } from "@playwright/test";
import { STORAGE_STATE_PATH } from "./tests/e2e/setup/global-setup";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

const isCI = !!process.env.CI;
const useExternalApp = !!process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
	testDir: "./tests/e2e",
	globalSetup: "./tests/e2e/setup/global-setup.ts",
	fullyParallel: true,
	forbidOnly: isCI,
	retries: isCI ? 2 : 0,
	// Two workers ran the critical stages side by side and hung a 16 GB machine.
	workers: 1,
	reporter: isCI ? "github" : "html",
	use: {
		baseURL,
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
	},
	// Three stages: a later one does not start when an earlier one fails (GDHUB-130).
	projects: [
		{
			name: "auth",
			testMatch: ["**/auth-flow.spec.ts"],
			use: { ...devices["Desktop Chrome"] },
		},
		{
			// Every page from src/app, on the stand with its personas: `bun run test:e2e:smoke`.
			name: "smoke",
			testMatch: ["**/smoke/*.spec.ts"],
			dependencies: ["auth"],
			timeout: 180_000,
			use: {
				...devices["Desktop Chrome"],
				// The dev server compiles a route on its first visit.
				navigationTimeout: 150_000,
			},
		},
		{
			name: "anonymous",
			testMatch: [
				"**/home.spec.ts",
				"**/hub.spec.ts",
				"**/admin.spec.ts",
				"**/protected-misc.spec.ts",
				"**/public-dynamic.spec.ts",
				"**/static-pages.spec.ts",
			],
			dependencies: ["smoke"],
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "onboarding",
			testMatch: ["**/onboarding.spec.ts", "**/onboarding-validation.spec.ts"],
			dependencies: ["smoke"],
			use: { ...devices["Desktop Chrome"] },
		},
		{
			// GDHUB-79, on the stand: `bun run test:e2e:checkpoints`. Paddle sandbox
			// and real model calls, so one at a time and never in CI.
			name: "checkpoints",
			testMatch: ["**/checkpoints/**/*.spec.ts"],
			dependencies: ["smoke"],
			fullyParallel: false,
			timeout: 15 * 60_000,
			use: {
				...devices["Desktop Chrome"],
				actionTimeout: 30_000,
				navigationTimeout: 60_000,
			},
		},
		{
			name: "authenticated",
			testMatch: ["**/*.authed.spec.ts"],
			dependencies: ["smoke"],
			use: {
				...devices["Desktop Chrome"],
				storageState: STORAGE_STATE_PATH,
			},
		},
	],
	webServer: useExternalApp
		? undefined
		: {
				command: "bun run dev",
				url: baseURL,
				reuseExistingServer: !isCI,
				timeout: 180_000,
			},
});
