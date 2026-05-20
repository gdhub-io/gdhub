import { expect, test } from "@playwright/test";

test.describe("home page", () => {
	test("loads and renders without console errors", async ({ page }) => {
		const consoleErrors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") consoleErrors.push(msg.text());
		});

		const response = await page.goto("/");
		expect(response?.ok()).toBeTruthy();

		await expect(page).toHaveTitle(/.+/);
		await expect(page.locator("body")).toBeVisible();

		expect(consoleErrors, `unexpected console errors:\n${consoleErrors.join("\n")}`).toEqual([]);
	});
});
