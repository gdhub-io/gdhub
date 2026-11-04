import { expect, test } from "@playwright/test";
import {
	fillProfileStep,
	fillSpecialityStep,
	startOnboarding,
} from "./setup/onboarding";
import { removeRun } from "./setup/users";

/**
 * Demonstrates the AI validation blocking the speciality step: gibberish in the
 * speciality name is rejected (the step does NOT advance) and the user can only
 * continue after fixing it. Requires OPENAI_API_KEY in the dev server's env —
 * without it validation fails open and this test is skipped.
 */
// This is the one spec that needs the AI in the loop. Runs set
// AI_VALIDATION_ENABLED=false to keep onboarding fast and free of API calls,
// and with it off there is nothing here to assert.
test.skip(
	process.env.AI_VALIDATION_ENABLED === "false",
	"AI validation is disabled in this environment",
);

test.afterAll(removeRun);

test("gibberish speciality is blocked until corrected", async ({ browser }) => {
	test.setTimeout(120_000);
	const page = await startOnboarding(browser, "onboarding-ai");

	// A real name, so the profile step does not even warn.
	await fillProfileStep(page, "Dmitry", "Petrov");
	const specialityName = await fillSpecialityStep(
		page,
		"asdfghjkl zxcvbnm qwerty",
	);

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
