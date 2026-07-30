import { expect, test } from "@playwright/test";

const staticPages = [
	{ path: "/", titleHint: /game.?dev|gdhub|gamelab/i },
	{ path: "/legal-details", titleHint: /legal/i },
	{ path: "/cookie-policy", titleHint: /cookie/i },
	{ path: "/privacy-policy", titleHint: /privacy/i },
	{ path: "/events", titleHint: /event/i },
	// /ui-test and /test-seo used to live at the root. They now sit under
	// /dev/* inside the (spaces) group, which the proxy matcher gates behind
	// auth — so an anonymous visitor only ever gets the sign-in page.
];

for (const { path, titleHint } of staticPages) {
	test(`${path} loads`, async ({ page }) => {
		const response = await page.goto(path);
		expect(response?.status(), `HTTP status for ${path}`).toBeLessThan(400);
		await expect(page.locator("body")).toBeVisible();
		await expect(page).toHaveTitle(titleHint);
	});
}

test("/non-existent-route renders the 404 page", async ({ page }) => {
	const response = await page.goto("/this-page-does-not-exist");
	expect(response?.status()).toBe(404);
	await expect(page.getByText(/404/)).toBeVisible();
});
