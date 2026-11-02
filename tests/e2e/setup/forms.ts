import type { Page } from "@playwright/test";

/**
 * Picks from an antd Select by its label: typing brings an option of a long,
 * virtual list into view, and Enter takes the first match (or the first option).
 */
export async function pick(page: Page, label: string | RegExp, option?: string) {
	const select = page.getByLabel(label, { exact: typeof label === "string" });
	await select.click();
	if (option) await select.pressSequentially(option);
	await page.keyboard.press("Enter");
}
