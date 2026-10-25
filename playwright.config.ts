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
	workers: isCI ? 1 : undefined,
	reporter: isCI ? "github" : "html",
	use: {
		baseURL,
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
	},
	projects: [
		{
			name: "anonymous",
			testMatch: [
				"**/auth-flow.spec.ts",
				"**/home.spec.ts",
				"**/hub.spec.ts",
				"**/admin.spec.ts",
				"**/protected-misc.spec.ts",
				"**/public-dynamic.spec.ts",
				"**/static-pages.spec.ts",
			],
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "onboarding",
			testMatch: ["**/onboarding.spec.ts", "**/onboarding-validation.spec.ts"],
			use: { ...devices["Desktop Chrome"] },
		},
		{
			// GDHUB-79, on the stand: `bun run test:e2e:checkpoints`. Paddle sandbox
			// and real model calls, so one at a time and never in CI.
			name: "checkpoints",
			testMatch: ["**/checkpoints/**/*.spec.ts"],
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
