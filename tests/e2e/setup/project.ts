import { expect, type Page } from "@playwright/test";
import { pick } from "./forms";

/** Creates a project from the hub's "New project" modal and returns its slug. */
export async function createProjectInHub(
	page: Page,
	name: string,
	pitch: string,
) {
	await page.goto("/hub");
	await page.getByRole("button", { name: /new project/i }).first().click();
	const modal = page.getByRole("dialog", { name: "Create new game project" });
	await expect(modal).toBeVisible();

	await modal.getByLabel("Title").fill(name);
	await modal.getByLabel("What's the game about").fill(pitch);
	await pick(page, "Genre");
	await modal.getByRole("checkbox", { name: /making this game myself/i }).check();
	await modal.getByRole("checkbox", { name: /Project Requirements/ }).check();

	await Promise.all([
		// Creation runs AI validation and, on a cold dev server, compiles the route.
		page.waitForURL(/\/user\/project\/[^/]+\/workflow$/, { timeout: 60_000 }),
		modal.getByRole("button", { name: /^create$/i }).click(),
	]);
	// The space opens on its workflow tab: /user/project/<slug>/workflow.
	const slug = new URL(page.url()).pathname.split("/").at(-2);
	expect(slug, "project slug in URL").toBeTruthy();
	return slug as string;
}
