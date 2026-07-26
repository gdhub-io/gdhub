import { expect, test } from "@playwright/test";
import { acceptCookieConsent } from "./setup/cookies";
import {
	cleanupOnboardingUser,
	ensureOnboardingUser,
	ONBOARDING_USER_EMAIL,
} from "./setup/onboarding-user";

test.describe.serial("onboarding flow for a new user", () => {
	test.beforeAll(async () => {
		await ensureOnboardingUser();
	});

	test.afterAll(async () => {
		await cleanupOnboardingUser();
	});

	test("complete onboarding from welcome to hub", async ({ page, baseURL }) => {
		test.setTimeout(60_000);
		// --- Sign in as the fresh (non-onboarded) user ---
		const csrfRes = await page.request.get("/api/auth/csrf");
		const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

		await page.request.post("/api/auth/callback/e2e-credentials", {
			form: {
				csrfToken,
				email: ONBOARDING_USER_EMAIL,
				callbackUrl: `${baseURL}/hub`,
				json: "true",
			},
		});

		// Navigate — proxy should redirect non-onboarded user to onboarding
		await acceptCookieConsent(page, baseURL);
		await page.goto("/hub");
		await expect(page).toHaveURL(/\/registration\/onboarding/);

		// --- Step 0: Welcome ---
		await expect(
			page.getByRole("heading", { level: 1, name: /welcome/i }),
		).toBeVisible();
		await page.getByRole("button", { name: /fill out the profile/i }).click();

		// --- Step 1: Profile ---
		await expect(
			page.getByRole("heading", { level: 2, name: /user profile/i }),
		).toBeVisible();

		await page.getByLabel(/first name/i).fill("E2E");
		await page.getByLabel(/last name/i).fill("Onboarding");

		// Year of birth select
		await page
			.locator(".ant-form-item")
			.filter({ hasText: /year of birth/i })
			.locator(".ant-select")
			.click();
		await page.locator(".ant-select-item-option-content").first().click();

		// Country autocomplete
		await page
			.locator(".ant-form-item")
			.filter({ hasText: /country/i })
			.getByRole("combobox")
			.fill("United");
		await page.getByTitle("United States").first().click();

		await page.getByLabel(/i confirm the accuracy/i).check();

		await page.getByRole("button", { name: /save and continue/i }).click();

		// --- Step 2: Speciality ---
		await expect(
			page.getByRole("heading", { level: 2, name: /speciality/i }),
		).toBeVisible();

		// Specialty Name
		await page
			.locator(".ant-form-item")
			.filter({ hasText: /specialty name/i })
			.getByRole("textbox")
			.fill("Game Designer");

		// Level select
		await page
			.locator(".ant-form-item")
			.filter({ hasText: /^level/i })
			.locator(".ant-select")
			.click();
		await page.locator(".ant-select-item-option-content").first().click();

		// Field of Activity select
		await page
			.locator(".ant-form-item")
			.filter({ hasText: /field of activity/i })
			.locator(".ant-select")
			.click();
		await page.getByText("Game Design", { exact: true }).click();

		// Specialization textarea
		await page
			.locator(".ant-form-item")
			.filter({ hasText: /specialization/i })
			.getByRole("textbox")
			.fill("Systems design, level design");

		// Experience textarea
		await page
			.locator(".ant-form-item")
			.filter({ hasText: /experience/i })
			.getByRole("textbox")
			.fill("2 years of game design experience");

		await page.getByRole("button", { name: /save and continue/i }).click();

		// --- Step 3: Interests ---
		await expect(
			page.getByRole("heading", { level: 2, name: /interests/i }),
		).toBeVisible();

		// Click the first interest card (Author)
		await page.locator("[role='button']", { hasText: /author/i }).click();

		await page.getByRole("button", { name: /save and continue/i }).click();

		// --- Step 4: Resources ---
		await expect(
			page.getByRole("heading", { level: 2, name: /rec?ources/i }),
		).toBeVisible();

		// Fill available time min/max
		const minInput = page.getByRole("spinbutton").first();
		const maxInput = page.getByRole("spinbutton").nth(1);
		await minInput.fill("5");
		await maxInput.fill("20");

		await page.getByRole("button", { name: /save/i }).click();

		// --- Step 5: Completed ---
		await expect(
			page.getByRole("heading", {
				level: 1,
				name: /successfully completed/i,
			}),
		).toBeVisible({ timeout: 10_000 });

		await page.getByRole("button", { name: /let.*s go/i }).click();
		await expect(page).toHaveURL(/\/hub/, { timeout: 10_000 });
	});
});
