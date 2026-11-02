import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100";

const isCI = !!process.env.CI;
const useExternalApp = !!process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
	testDir: "./tests/e2e",
	fullyParallel: true,
	forbidOnly: isCI,
	retries: isCI ? 2 : 0,
	// Two workers ran the critical stages side by side and hung a 16 GB machine.
	workers: 1,
	// The html report is written, never served: serving it holds the run open.
	reporter: isCI ? "github" : [["line"], ["html", { open: "never" }]],
	use: {
		baseURL,
		// Locally there is no retry, so a trace on retry would never be recorded.
		trace: isCI ? "on-first-retry" : "retain-on-failure",
		screenshot: "only-on-failure",
		video: "off",
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
			// Creating a project runs AI validation and compiles routes on a cold stand.
			timeout: 150_000,
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: useExternalApp
		? undefined
		: {
				command: "bun run dev:test",
				url: `${baseURL}/api/auth/csrf`,
				reuseExistingServer: !isCI,
				timeout: 180_000,
			},
});
