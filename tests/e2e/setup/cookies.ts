import type { Page } from "@playwright/test";
import {
	CONSENT_DECIDED_KEY,
	CONSENT_VERSION,
	CONSENT_VERSION_KEY,
} from "../../../src/helpers/googleConsent";

/**
 * Pre-sets the answer to the cookie banner, for its current consent version, so
 * the banner never renders. It otherwise overlays action buttons (e.g. "Save and
 * continue") and intercepts Playwright's clicks. Call before the first navigation.
 */
export async function acceptCookieConsent(page: Page, baseURL?: string) {
	const url = baseURL ?? "http://localhost:3100";
	await page.context().addCookies([
		{ name: CONSENT_DECIDED_KEY, value: "true", url },
		{ name: CONSENT_VERSION_KEY, value: CONSENT_VERSION, url },
	]);
}
