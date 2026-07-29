import { expect, type Locator, type Page, test } from "@playwright/test";

const ts = () => Date.now().toString(36);

function futureDate(days: number): string {
	const d = new Date();
	d.setDate(d.getDate() + days);
	const dd = String(d.getDate()).padStart(2, "0");
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	return `${dd}.${mm}.${d.getFullYear()}`;
}

async function createProject(page: Page): Promise<string> {
	await page.goto("/hub");
	await page
		.getByRole("button", { name: /new project/i })
		.first()
		.click();
	const modal = page.getByRole("dialog");
	await expect(modal).toBeVisible();
	await modal.getByLabel(/title/i).fill(`E2E Vac ${ts()}`);
	await modal.getByLabel(/short description/i).fill("e2e vacancy");
	await modal
		.getByRole("checkbox", { name: /requirements for game projects/i })
		.check();
	await Promise.all([
		// Generous timeout: on a cold dev server the route compiles on first hit.
		page.waitForURL(/\/my\/projects\/[^/]+(\/|$)/, { timeout: 60_000 }),
		modal.getByRole("button", { name: /^create$/i }).click(),
	]);
	const slug = new URL(page.url()).pathname.split("/").filter(Boolean).at(-1);
	expect(slug, "project slug").toBeTruthy();
	return slug as string;
}

// Fills the always-required fields of an open vacancy modal (not the payment block).
async function fillVacancyBase(page: Page, modal: Locator, title: string) {
	await modal.getByLabel(/name of the open position/i).fill(title);

	const dateInput = modal.getByLabel(/relevant to/i);
	await dateInput.click();
	await dateInput.fill(futureDate(30));
	await dateInput.press("Enter");

	await modal.getByLabel(/what direction/i).click();
	await page.locator(".ant-select-item-option").first().click();

	await modal.getByLabel(/open position description/i).fill("e2e description");
}

async function deleteProject(page: Page, slug: string) {
	await page.goto(`/user/project/${slug}/settings/danger`);
	await page.getByRole("button", { name: /^delete$/i }).click();
	const del = page.getByRole("dialog");
	const confirmInput = del.getByRole("textbox");
	const currentName = await confirmInput.getAttribute("placeholder");
	if (currentName) await confirmInput.fill(currentName);
	await Promise.all([
		page.waitForURL(/\/hub(\/|$)/, { timeout: 30_000 }),
		del.getByRole("button", { name: /^delete$/i }).click(),
	]);
}

test("paid vacancy: create draft → offered comp + pending → edit reload → archive → restore duplicate", async ({
	page,
}) => {
	test.setTimeout(150_000);

	const slug = await createProject(page);
	await page.goto(`/user/project/${slug}/vacancies`);
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
	await modal.locator(".ant-modal-close").click();
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
	await dupModal.locator(".ant-modal-close").click();

	await expect(
		page.getByRole("row", { name: new RegExp(vacancyTitle) }),
	).toBeVisible({ timeout: 15_000 });

	await deleteProject(page, slug);
});

test("free vacancy: publish without payment → published, no fee", async ({
	page,
}) => {
	test.setTimeout(150_000);

	const slug = await createProject(page);
	await page.goto(`/user/project/${slug}/vacancies`);
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

	await deleteProject(page, slug);
});
