import { expect, test } from "@playwright/test";
import { acceptCookieConsent } from "./setup/cookies";
import {
	cleanupOnboardingUser,
	ensureOnboardingUser,
	ONBOARDING_AI_USER_EMAIL,
} from "./setup/onboarding-user";

/**
 * Demonstrates the AI validation blocking the speciality step: gibberish in the
 * speciality name is rejected (the step does NOT advance) and the user can only
 * continue after fixing it. Requires OPENAI_API_KEY in the dev server's env —
 * without it validation fails open and this test is skipped.
 */
test.describe.serial("onboarding AI validation blocks bad input", () => {
	// This is the one spec that needs the AI in the loop. Runs set
	// AI_VALIDATION_ENABLED=false to keep onboarding fast and free of API calls,
	// and with it off there is nothing here to assert.
	test.skip(
		process.env.AI_VALIDATION_ENABLED === "false",
		"AI validation is disabled in this environment",
	);

	test.beforeAll(async () => {
		await ensureOnboardingUser(ONBOARDING_AI_USER_EMAIL);
	});

	test.afterAll(async () => {
		await cleanupOnboardingUser(ONBOARDING_AI_USER_EMAIL);
	});

	test("gibberish speciality is blocked until corrected", async ({
		page,
		baseURL,
	}) => {
		test.setTimeout(120_000);

		// --- Sign in as the fresh (non-onboarded) AI test user ---
		const csrfRes = await page.request.get("/api/auth/csrf");
		const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
		await page.request.post("/api/auth/callback/e2e-credentials", {
			form: {
				csrfToken,
				email: ONBOARDING_AI_USER_EMAIL,
				callbackUrl: `${baseURL}/hub`,
				json: "true",
			},
		});

		await acceptCookieConsent(page, baseURL);
		await page.goto("/hub");
		await expect(page).toHaveURL(/\/registration\/onboarding/);

		// --- Welcome ---
		await page.getByRole("button", { name: /fill out the profile/i }).click();

		// --- Profile (all valid — a real name so it doesn't even warn) ---
		await expect(
			page.getByRole("heading", { level: 2, name: /user profile/i }),
		).toBeVisible();
		await page.getByLabel(/first name/i).fill("Dmitry");
		await page.getByLabel(/last name/i).fill("Petrov");
		await page
			.locator(".ant-form-item")
			.filter({ hasText: /year of birth/i })
			.locator(".ant-select")
			.click();
		await page.locator(".ant-select-item-option-content").first().click();
		await page
			.locator(".ant-form-item")
			.filter({ hasText: /country/i })
			.getByRole("combobox")
			.fill("United");
		await page.getByTitle("United States").first().click();
		await page.getByLabel(/i confirm the accuracy/i).check();
		await page.getByRole("button", { name: /save and continue/i }).click();

		// --- Speciality: fill everything valid EXCEPT a gibberish name ---
		// "Speciality" is a label in the antd Steps bar, not a heading, so anchor
		// on the step's own field instead.
		const specialityName = page
			.locator(".ant-form-item")
			.filter({ hasText: /specialty name/i })
			.getByRole("textbox");
		// Saving the profile step runs AI validation, so the next step can take far
		// longer than the default 5s expect budget to appear.
		await expect(specialityName).toBeVisible({ timeout: 30_000 });
		await specialityName.fill("asdfghjkl zxcvbnm qwerty");

		await page
			.locator(".ant-form-item")
			.filter({ hasText: /^level/i })
			.locator(".ant-select")
			.click();
		await page.locator(".ant-select-item-option-content").first().click();

		await page
			.locator(".ant-form-item")
			.filter({ hasText: /field of activity/i })
			.locator(".ant-select")
			.click();
		await page.getByText("Game Design", { exact: true }).click();

		await page
			.locator(".ant-form-item")
			.filter({ hasText: /specialization/i })
			.getByRole("textbox")
			.fill("Systems design and combat balance for mobile games");

		await page
			.locator(".ant-form-item")
			.filter({ hasText: /experience/i })
			.getByRole("textbox")
			.fill("3 years designing mobile games");

		// Try to save — the AI must BLOCK this.
		await page.getByRole("button", { name: /save and continue/i }).click();

		// A blocking error appears on the form and the step does NOT advance:
		// the Interests heading must not show up.
		await expect(page.locator(".ant-form-item-explain-error")).toBeVisible({
			timeout: 30_000,
		});
		await expect(
			page.getByRole("heading", { level: 2, name: /speciality/i }),
		).toBeVisible();
		await expect(
			page.getByRole("heading", { level: 2, name: /interests/i }),
		).toHaveCount(0);

		// --- Fix the name, then save again — now it must pass ---
		await specialityName.fill("Game Designer");
		await page.getByRole("button", { name: /save and continue/i }).click();

		await expect(
			page.getByRole("heading", { level: 2, name: /interests/i }),
		).toBeVisible({ timeout: 30_000 });
	});
});
