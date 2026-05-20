import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

const isCI = !!process.env.CI;
const useExternalApp = !!process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
	testDir: "./tests/e2e",
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
		{ name: "chromium", use: { ...devices["Desktop Chrome"] } },
	],
	webServer: useExternalApp
		? undefined
		: {
				command: "yarn dev",
				url: baseURL,
				reuseExistingServer: !isCI,
				timeout: 180_000,
			},
});
