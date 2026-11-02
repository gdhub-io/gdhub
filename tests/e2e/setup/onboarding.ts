import { type Browser, expect, type Page } from "@playwright/test";
import { pick } from "./forms";
import { signUp } from "./users";

/** A user who has just confirmed their email, sent to onboarding and past its welcome. */
export async function startOnboarding(browser: Browser, label: string) {
	const page = await signUp(browser, label);
	await page.goto("/hub");
	await expect(page).toHaveURL(/\/registration\/onboarding/);
	await expect(
		page.getByRole("heading", { level: 1, name: /welcome/i }),
	).toBeVisible();
	await page.getByRole("button", { name: /fill out the profile/i }).click();
	return page;
}

/** The profile step, filled and saved. */
export async function fillProfileStep(page: Page, first: string, last: string) {
	await expect(
		page.getByRole("heading", { level: 2, name: /user profile/i }),
	).toBeVisible();
	await page.getByLabel(/first name/i).fill(first);
	await page.getByLabel(/last name/i).fill(last);
	await pick(page, /year of birth/i, "1990");
	await page.getByLabel(/country/i).fill("United");
	await page.getByTitle("United States").first().click();
	await page.getByLabel(/i confirm the accuracy/i).check();
	await page.getByRole("button", { name: /save and continue/i }).click();
}

/** The speciality step, filled but not saved. */
export async function fillSpecialityStep(page: Page, name: string) {
	const specialityName = page.getByLabel(/specialty name/i);
	// Saving the profile step runs AI validation, so this step can take a while to appear.
	await expect(specialityName).toBeVisible({ timeout: 30_000 });
	await specialityName.fill(name);
	await pick(page, /^level/i);
	await pick(page, /field of activity/i);
	await page
		.getByLabel(/specialization/i)
		.fill("Systems design and combat balance for mobile games");
	await page.getByLabel(/experience/i).fill("3 years designing mobile games");
	return specialityName;
}
