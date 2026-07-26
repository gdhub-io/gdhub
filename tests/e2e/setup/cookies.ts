import type { Page } from "@playwright/test";

/**
 * Pre-sets the cookie-consent cookie so the CookieConsent banner never renders.
 * The banner otherwise overlays action buttons (e.g. "Save and continue") and
 * intercepts Playwright's clicks. Call before the first navigation.
 */
export async function acceptCookieConsent(page: Page, baseURL?: string) {
	await page.context().addCookies([
		{
			name: "cookie_consent_is_true",
			value: "true",
			url: baseURL ?? "http://localhost:3000",
		},
	]);
}
