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

// An invite link for a signed-out visitor goes to sign-in with a callback back
// to the invite, so the token is only validated once there is a session. The
// bad-token error card is asserted in team-invite.authed.spec.ts.
test("/invite/<token> sends an unauthenticated visitor to sign in", async ({
	page,
}) => {
	const response = await page.goto("/invite/__definitely-missing__");
	expect(response?.status()).toBeLessThan(400);
	await expect(page).toHaveURL(/\/signin\?callbackUrl=.*invite/);
});

test("/signin?error=RefreshTokenExpired shows session-expired message", async ({
	page,
}) => {
	await page.goto("/signin?error=RefreshTokenExpired");
	// `.first()`: React strict mode runs the effect twice in dev, so the toast
	// renders twice and a bare locator trips strict mode.
	await expect(page.getByText(/session has expired/i).first()).toBeVisible({
		timeout: 5_000,
	});
});
