import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { type FullConfig, request } from "@playwright/test";
import { cleanupTestUserProjects, ensureTestUser, TEST_USER_EMAIL } from "./test-user";

export const STORAGE_STATE_PATH = "tests/e2e/setup/storage-state.json";

/**
 * Runs once before the entire Playwright suite.
 *
 * Pipeline:
 *  1. Upsert the e2e test user in the DB (via Prisma).
 *  2. Clean up any orphan projects from previous failed runs.
 *  3. Sign in through the gated `e2e-credentials` NextAuth provider.
 *  4. Save the resulting session cookies to `storage-state.json`, which
 *     every test then reuses via `playwright.config.ts > use.storageState`.
 *
 * Requires the app to run with `E2E_TEST_AUTH=1` so the credentials
 * provider is registered (see `src/auth.ts`).
 */
export default async function globalSetup(config: FullConfig) {
	if (process.env.E2E_TEST_AUTH !== "1") {
		throw new Error(
			"Playwright e2e tests need E2E_TEST_AUTH=1 in the dev server's env " +
				"so the gated CredentialsProvider is active. Add it to .env.test " +
				"(see .env.test.example) and restart `bun run dev`.",
		);
	}

	await ensureTestUser();
	await cleanupTestUserProjects();

	const baseURL =
		config.projects[0]?.use.baseURL ??
		process.env.PLAYWRIGHT_BASE_URL ??
		"http://localhost:3000";

	const ctx = await request.newContext({ baseURL });

	// NextAuth requires a CSRF token before any sign-in POST.
	const csrfResponse = await ctx.get("/api/auth/csrf");
	if (!csrfResponse.ok()) {
		throw new Error(
			`Failed to fetch /api/auth/csrf: ${csrfResponse.status()} ${csrfResponse.statusText()}`,
		);
	}
	const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };

	const callbackResponse = await ctx.post(
		"/api/auth/callback/e2e-credentials",
		{
			form: {
				csrfToken,
				email: TEST_USER_EMAIL,
				callbackUrl: `${baseURL}/hub`,
				json: "true",
			},
		},
	);

	if (!callbackResponse.ok()) {
		const body = await callbackResponse.text().catch(() => "<unreadable>");
		throw new Error(
			`Credentials sign-in failed: ${callbackResponse.status()} ${callbackResponse.statusText()}\n${body}`,
		);
	}

	const sessionResponse = await ctx.get("/api/auth/session");
	const session = (await sessionResponse.json()) as { user?: { email?: string } };
	if (session?.user?.email?.toLowerCase() !== TEST_USER_EMAIL.toLowerCase()) {
		throw new Error(
			"E2E sign-in did not produce a session for the test user. " +
				`Got: ${JSON.stringify(session)}`,
		);
	}

	mkdirSync(dirname(STORAGE_STATE_PATH), { recursive: true });
	await ctx.storageState({ path: STORAGE_STATE_PATH });
	await ctx.dispose();
}
