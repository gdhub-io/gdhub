import { expect, test } from "@playwright/test";

test("/blog/<missing-slug> returns 404", async ({ page }) => {
	const response = await page.goto("/blog/__definitely-missing__");
	expect(response?.status()).toBe(404);
});

test("/event/<missing-slug> returns 404", async ({ page }) => {
	const response = await page.goto("/event/__definitely-missing__");
	expect(response?.status()).toBe(404);
});

test("/expert/<missing-id> returns 404", async ({ page }) => {
	const response = await page.goto("/expert/__definitely-missing__");
	expect(response?.status()).toBe(404);
});

test("/project/<missing-slug> returns 404", async ({ page }) => {
	const response = await page.goto("/project/__definitely-missing__");
	expect(response?.status()).toBe(404);
});

test("/job/<missing-id> returns 404", async ({ page }) => {
	const response = await page.goto("/job/__definitely-missing__");
	expect(response?.status()).toBe(404);
});

test("/devlog/<missing-id> returns 404", async ({ page }) => {
	const response = await page.goto("/devlog/__definitely-missing__");
	expect(response?.status()).toBe(404);
});

test("/verify/<missing-number> returns 200 with not-found message", async ({
	page,
}) => {
	const response = await page.goto("/verify/__not-real__");
	expect(response?.status(), "page renders, sets meta robots noindex").toBe(
		200,
	);
	await expect(page.getByText(/not found/i).first()).toBeVisible();
});
