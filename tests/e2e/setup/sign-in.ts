import { expect, type Page, test } from "@playwright/test";

export const baseURL = () =>
	test.info().project.use.baseURL ?? "http://localhost:3100";

/** Signs the page's context in through the test-only credentials provider. */
export async function signIn(page: Page, email: string) {
	const { csrfToken } = (await (
		await page.request.get("/api/auth/csrf")
	).json()) as { csrfToken: string };
	const signedIn = await page.request.post(
		"/api/auth/callback/e2e-credentials",
		{
			form: {
				csrfToken,
				email,
				callbackUrl: `${baseURL()}/hub`,
				json: "true",
			},
		},
	);
	expect(
		signedIn.ok(),
		`sign-in as ${email}: the stand needs E2E_TEST_AUTH=1 (bun run dev:test)`,
	).toBe(true);
}
