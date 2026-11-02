import { expect, type Locator, type Page, test } from "@playwright/test";
import { pick } from "./setup/forms";
import { createProjectInHub } from "./setup/project";
import {
	grantUser,
	removeRun,
	type StandUser,
	signInPage,
} from "./setup/users";

const ts = () => Date.now().toString(36);

function futureDate(days: number): string {
	const d = new Date();
	d.setDate(d.getDate() + days);
	const dd = String(d.getDate()).padStart(2, "0");
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	return `${dd}.${mm}.${d.getFullYear()}`;
}

let author: StandUser;

test.beforeAll(async () => {
	author = await grantUser("vacancy");
});
test.afterAll(removeRun);

const createProject = async (page: Page) => {
	await signInPage(page, author);
	return createProjectInHub(page, `E2E Vac ${ts()}`, "e2e vacancy");
};

// Fills the always-required fields of an open vacancy modal (not the payment block).
async function fillVacancyBase(page: Page, modal: Locator, title: string) {
	await modal.getByLabel(/name of the open position/i).fill(title);

	const dateInput = modal.getByLabel(/relevant to/i);
	await dateInput.click();
	await dateInput.fill(futureDate(30));
	await dateInput.press("Enter");

	await pick(page, /what direction/i);

	await modal.getByLabel(/open position description/i).fill("e2e description");
}

test("paid vacancy: create draft → offered comp + pending → edit reload → archive → restore duplicate", async ({
	page,
}) => {
	const slug = await createProject(page);
	await page.goto(`/user/project/${slug}/open-positions`);
	const addBtn = page.getByRole("button", { name: /add open position/i });
	await expect(addBtn).toBeVisible();

	const vacancyTitle = `Paid role ${ts()}`;

	// --- create a PAID vacancy and save it as a draft (no checkout) ---
	await addBtn.click();
	let modal = page.getByRole("dialog");
	await expect(modal).toBeVisible();
	await fillVacancyBase(page, modal, vacancyTitle);

	await modal.getByRole("button", { name: /add payment/i }).click();
	await modal.getByLabel(/amount \(eur\)/i).fill("500");
	await modal.getByLabel(/rate type/i).click();
	await page
		.locator(".ant-select-item-option")
		.filter({ hasText: /monthly/i })
		.click();

	await Promise.all([
		page.waitForResponse(
			(r) =>
				r.url().includes("/api/user/project/vacancy/payment") &&
				r.request().method() === "POST",
			{ timeout: 30_000 },
		),
		modal.getByRole("button", { name: /save as draft/i }).click(),
	]);
	await expect(modal).toBeHidden();

	// --- the row shows offered compensation + a pending fee + draft state ---
	const row = page.getByRole("row", { name: new RegExp(vacancyTitle) });
	await expect(row).toBeVisible({ timeout: 15_000 });
	await expect(row.getByText(/draft/i)).toBeVisible();
	await expect(row.getByText(/€500/)).toBeVisible();
	await expect(row.getByText(/pending/i)).toBeVisible();
	await expect(
		row.getByRole("button", { name: /pay & publish/i }),
	).toBeVisible();

	// --- editing repopulates the offered amount from the vacancy ---
	await row.getByRole("button", { name: /^change$/i }).click();
	modal = page.getByRole("dialog");
	await expect(modal).toBeVisible();
	await expect(modal.getByLabel(/amount \(eur\)/i)).toHaveValue("500");
	await modal.getByRole("button", { name: "Close" }).click();
	await expect(modal).toBeHidden();

	// --- archive via the 3-dot menu ---
	await row.getByRole("button", { name: /actions/i }).click();
	await page.getByRole("menuitem", { name: /archive/i }).click();
	const confirm = page.getByRole("dialog");
	await confirm.getByRole("button", { name: /^yes$/i }).click();
	await expect(
		page.getByRole("row", { name: new RegExp(vacancyTitle) }),
	).toHaveCount(0, { timeout: 15_000 });

	// --- restore = a brand-new draft duplicate (archived one stays closed) ---
	await page.getByRole("button", { name: /^archive$/i }).click();
	const archiveModal = page.getByRole("dialog");
	await expect(archiveModal).toBeVisible();
	await archiveModal.getByText(vacancyTitle).click();
	await archiveModal.getByRole("button", { name: /restore/i }).click();

	const dupModal = page.getByRole("dialog");
	await expect(dupModal).toBeVisible();
	await dupModal.getByRole("button", { name: "Close" }).click();

	await expect(
		page.getByRole("row", { name: new RegExp(vacancyTitle) }),
	).toBeVisible({ timeout: 15_000 });

});

test("free vacancy: publish without payment → published, no fee", async ({
	page,
}) => {
	const slug = await createProject(page);
	await page.goto(`/user/project/${slug}/open-positions`);
	const addBtn = page.getByRole("button", { name: /add open position/i });
	await expect(addBtn).toBeVisible();

	const vacancyTitle = `Free role ${ts()}`;

	// --- create a FREE vacancy (no payment block) and publish it directly ---
	await addBtn.click();
	const modal = page.getByRole("dialog");
	await expect(modal).toBeVisible();
	await fillVacancyBase(page, modal, vacancyTitle);

	await Promise.all([
		page.waitForResponse(
			(r) =>
				r.url().includes("/api/user/project/vacancy") &&
				!r.url().includes("/payment") &&
				r.request().method() === "POST",
			{ timeout: 30_000 },
		),
		modal.getByRole("button", { name: /^publish$/i }).click(),
	]);
	await expect(modal).toBeHidden();

	// --- published, no draft tag, no fee/offer, no publish button ---
	const row = page.getByRole("row", { name: new RegExp(vacancyTitle) });
	await expect(row).toBeVisible({ timeout: 15_000 });
	await expect(row.getByText(/^draft$/i)).toHaveCount(0);
	await expect(row.getByText(/€/)).toHaveCount(0);
	await expect(row.getByText(/pending/i)).toHaveCount(0);
	await expect(row.getByRole("button", { name: /publish/i })).toHaveCount(0);
	// it is editable (a published vacancy still has the Change button)
	await expect(row.getByRole("button", { name: /^change$/i })).toBeVisible();

});
