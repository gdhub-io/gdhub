import { expect, type Locator, type Page } from "@playwright/test";
import { prisma } from "../../../src/services/prisma";
import { pick } from "./forms";

/** `dd.mm.yyyy`, the way the vacancy form's date field takes it. */
export function futureDate(days: number): string {
	const d = new Date();
	d.setDate(d.getDate() + days);
	const dd = String(d.getDate()).padStart(2, "0");
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	return `${dd}.${mm}.${d.getFullYear()}`;
}

/** The always-required fields of the vacancy form (not the payment block). */
export async function fillVacancyBase(page: Page, modal: Locator, title: string) {
	await modal.getByLabel(/name of the open position/i).fill(title);

	const dateInput = modal.getByLabel(/relevant to/i);
	await dateInput.click();
	await dateInput.fill(futureDate(30));
	await dateInput.press("Enter");

	await pick(page, /what direction/i);

	await modal.getByLabel(/open position description/i).fill("e2e description");
}

/**
 * Adds a vacancy on the project's open positions page. With a price it is saved
 * as a draft, its listing fee pending; without one it is published at once.
 */
export async function addVacancy(
	page: Page,
	slug: string,
	title: string,
	price?: number,
) {
	await page.goto(`/user/project/${slug}/open-positions`);
	await page.getByRole("button", { name: /add open position/i }).click();
	const modal = page.getByRole("dialog");
	await expect(modal).toBeVisible();
	await fillVacancyBase(page, modal, title);

	if (price) {
		await modal.getByRole("button", { name: /add payment/i }).click();
		await modal.getByLabel(/amount \(eur\)/i).fill(String(price));
		await modal.getByLabel(/rate type/i).click();
		// Not searchable, so the option is picked from the open list.
		await page.locator(".ant-select-item-option").filter({ hasText: /monthly/i }).click();
		await modal.getByRole("button", { name: /save as draft/i }).click();
	} else {
		await modal.getByRole("button", { name: /^publish$/i }).click();
	}
	await expect(modal).toBeHidden({ timeout: 30_000 });

	return prisma.teamVacancy.findFirstOrThrow({
		where: { title, team: { project: { slug } } },
		select: { id: true },
	});
}

/** The row of a vacancy on the author's open positions page. */
export const vacancyRow = (page: Page, title: string) =>
	page.getByRole("row", { name: new RegExp(title) });
