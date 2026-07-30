import { expect, test } from "@playwright/test";

const ts = () => Date.now().toString(36);

test("create → edit in settings/general → delete via danger zone", async ({
	page,
}) => {
	// Creation alone runs AI validation and can take ~25s on a dev server, so the
	// default 30s test budget leaves nothing for the edit and delete steps.
	test.setTimeout(120_000);
	const initialName = `E2E Project ${ts()}`;
	const renamedName = `${initialName} Renamed`;
	const description = "Created by the project-crud e2e test.";

	// --- 1. Open hub and launch the create-project modal ---
	await page.goto("/hub");
	await expect(page).toHaveURL(/\/hub(\/|$)/);

	await page.getByRole("button", { name: /new project/i }).first().click();

	const modal = page.getByRole("dialog");
	await expect(modal).toBeVisible();

	// --- 2. Fill in the form, accept the requirements, submit ---
	await modal.getByLabel(/title/i).fill(initialName);
	await modal.getByLabel(/short description/i).fill(description);
	await modal
		.getByRole("checkbox", { name: /requirements for game projects/i })
		.check();

	await Promise.all([
		// Same generous window as paid-vacancy: creation runs AI validation and,
		// on a cold dev server, compiles the route on first hit. 15s was not enough.
		page.waitForURL(/\/user\/project\/[^/]+(\/|$)/, { timeout: 60_000 }),
		modal.getByRole("button", { name: /^create$/i }).click(),
	]);

	const projectUrl = new URL(page.url());
	const slug = projectUrl.pathname.split("/").filter(Boolean).at(-1);
	expect(slug, "project slug in URL").toBeTruthy();

	// --- 3. Edit the project in settings/general ---
	await page.goto(`/user/project/${slug}/settings/general`);
	await expect(
		page.getByRole("menuitem", { name: /general/i }),
	).toBeVisible();

	const nameInput = page.getByRole("textbox", { name: /project name/i });
	await expect(nameInput).toHaveValue(initialName);
	await nameInput.fill(renamedName);

	// settings/general has additional required fields that the create-project
	// modal doesn't ask for. Fill them all so form.validateFields() passes.
	const required: Array<[RegExp, string]> = [
		[/platform/i, "PC, Mobile"],
		[/genre/i, "Adventure"],
		[/setting/i, "Sci-Fi"],
		[/visual style/i, "2D"],
		[/audition|target audience/i, "Casual gamers"],
	];
	for (const [label, value] of required) {
		await page.getByRole("textbox", { name: label }).fill(value);
	}

	const saveButton = page.getByRole("button", { name: /save/i }).last();
	await saveButton.scrollIntoViewIfNeeded();

	const putResponse = page.waitForResponse(
		(res) =>
			res.url().includes("/api/user/project") &&
			res.request().method() === "PUT",
		{ timeout: 15_000 },
	);
	await saveButton.click();
	const putRes = await putResponse;
	expect(putRes.status()).toBeLessThan(400);
	await expect(nameInput).toHaveValue(renamedName);

	// --- 4. Delete via danger zone ---
	await page.goto(`/user/project/${slug}/settings/danger`);
	await page.getByRole("button", { name: /^delete$/i }).click();

	const deleteDialog = page.getByRole("dialog");
	await expect(deleteDialog).toBeVisible();

	// The confirmation input requires typing the exact current project name.
	// Read it from the placeholder so we don't depend on cache-refetch timing
	// of `useCurrentProject` in the danger zone.
	const confirmInput = deleteDialog.getByRole("textbox");
	const currentName = await confirmInput.getAttribute("placeholder");
	if (!currentName) {
		throw new Error("Delete dialog input is missing a placeholder");
	}
	await confirmInput.fill(currentName);

	await Promise.all([
		page.waitForURL(/\/hub(\/|$)/, { timeout: 15_000 }),
		deleteDialog.getByRole("button", { name: /^delete$/i }).click(),
	]);

	// The redirect to /hub after the confirm click already proves the delete
	// went through. The app does a soft-delete (sets project status), so the
	// detail route may still resolve afterwards — don't assert 404 here.
});
