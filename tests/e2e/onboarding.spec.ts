import { expect, test } from "@playwright/test";
import {
	fillProfileStep,
	fillSpecialityStep,
	startOnboarding,
} from "./setup/onboarding";
import { removeRun } from "./setup/users";

test.afterAll(removeRun);

test("complete onboarding from welcome to hub", async ({ browser }) => {
	test.setTimeout(120_000);
	const page = await startOnboarding(browser, "onboarding");

	await fillProfileStep(page, "E2E", "Onboarding");
	await fillSpecialityStep(page, "Game Designer");
	await page.getByRole("button", { name: /save and continue/i }).click();

	// --- Step 3: Interests ---
	// "Interests" is a label in the antd Steps bar, not a heading, so assert on
	// the step's own content instead.
	const authorCard = page.getByRole("radio", { name: /be author/i });
	await expect(authorCard).toBeVisible();
	await authorCard.click();

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
