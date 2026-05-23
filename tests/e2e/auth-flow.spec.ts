import { expect, test } from "@playwright/test";

test("/signin loads with title and email/google buttons", async ({ page }) => {
	const response = await page.goto("/signin");
	expect(response?.status()).toBeLessThan(400);
	await expect(page).toHaveTitle(/sign in/i);
	await expect(page.getByRole("button", { name: /log in with email/i })).toBeVisible();
	await expect(page.getByRole("button", { name: /log in with google/i })).toBeVisible();
});

test("/registration loads", async ({ page }) => {
	const response = await page.goto("/registration");
	expect(response?.status()).toBeLessThan(400);
	await expect(page).toHaveTitle(/registration/i);
	await expect(page.getByRole("button", { name: /create new account/i })).toBeVisible();
});

test("/registration/onboarding loads (welcome step for unauth visitor)", async ({
	page,
}) => {
	const response = await page.goto("/registration/onboarding");
	expect(response?.status()).toBeLessThan(400);
	await expect(page).toHaveTitle(/registration/i);
});

test("/invite/<missing-token> renders error card", async ({ page }) => {
	const response = await page.goto("/invite/__definitely-missing__");
	expect(response?.status()).toBeLessThan(400);
	await expect(page.getByText(/error|failed/i).first()).toBeVisible();
});

test("/signin?error=RefreshTokenExpired shows session-expired message", async ({
	page,
}) => {
	await page.goto("/signin?error=RefreshTokenExpired");
	await expect(page.getByText(/session has expired/i)).toBeVisible({
		timeout: 5_000,
	});
});
