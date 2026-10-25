import { expect, type Page, test } from "@playwright/test";
import { prisma } from "../../../src/services/prisma";
import { RunLog } from "./support/run-log";
import { grantUser, makeProject, removeRun, signInAs } from "./support/stand";

/**
 * GDHUB-79 A2: artifacts are added from the project's Artifacts tab, filed
 * under the stage, and their links checked: one opens, one asks for a login,
 * one is gone. A broken link is replaced and checked again; an artifact is
 * deleted.
 */

const log = new RunLog("A2 artifacts");

const LINKS = {
	opens: "https://example.com/",
	login: "https://github.com/login",
	gone: "https://github.com/gdhub-io/no-such-repository-e2e",
};

const addArtifact = async (
	page: Page,
	kind: string,
	name: string,
	link: string,
) => {
	await page.getByRole("button", { name: "Add artifact" }).first().click();
	const dialog = page.getByRole("dialog", { name: "Add artifact" });
	await dialog.getByText(kind, { exact: true }).click();
	await dialog.getByLabel("Link").fill(link);
	await dialog.getByLabel("Name").fill(name);
	await expect(dialog).toContainText("Filed under Prototyping");
	await dialog.getByRole("button", { name: "Add artifact" }).click();
	await expect(dialog).toBeHidden();
};

const checkOf = (projectId: string, name: string) =>
	prisma.projectArtifact
		.findFirst({
			where: { projectId, name },
			select: { checkStatus: true, checkNote: true },
		})
		.then((row) => `${row?.checkStatus}:${row?.checkNote ?? ""}`);

test.afterAll(async () => {
	await log.write();
	await removeRun();
});

test("artifacts are filed by stage and their links checked", async ({
	browser,
}) => {
	const author = await grantUser("author-a2");
	const page = await signInAs(browser, author);
	const project = await makeProject(page, "Tidebound");

	await page.goto(`/user/project/${project.slug}/artifacts`);
	await expect(page.getByText("Your first artifact will appear here.")).toBeVisible();

	await addArtifact(page, "Image", "Tide states, key art", LINKS.opens);
	await addArtifact(page, "Build", "Prototype build", LINKS.login);
	await addArtifact(page, "Other", "Level plans", LINKS.gone);
	log.step("Added three artifacts on Prototyping");

	await expect
		.poll(() => checkOf(project.id, "Tide states, key art"), { timeout: 30_000 })
		.toBe("Readable:");
	await expect
		.poll(() => checkOf(project.id, "Prototype build"), { timeout: 30_000 })
		.toBe("Unreachable:needsLogin");
	await expect
		.poll(() => checkOf(project.id, "Level plans"), { timeout: 30_000 })
		.toBe("Unreachable:notFound");
	log.step("Checked: opens · needs a login · not found");

	await page.reload();
	await expect(page.getByText("Prototyping").first()).toBeVisible();
	const row = (name: string) => page.getByRole("row").filter({ hasText: name });
	await expect(row("Tide states, key art")).toContainText("Ready");
	await expect(row("Prototype build")).toContainText("Cannot be opened");
	await expect(row("Level plans")).toContainText("Cannot be opened");

	// What to do about a broken link is the row under the artifact.
	await row("Level plans")
		.locator("xpath=following-sibling::tr[1]")
		.getByRole("button", { name: "Replace the link" })
		.click();
	const replace = page.getByRole("dialog", { name: "Replace the link" });
	await replace.getByRole("textbox").fill(LINKS.opens);
	await replace.getByRole("button", { name: "Save and check" }).click();
	await expect
		.poll(() => checkOf(project.id, "Level plans"), { timeout: 30_000 })
		.toBe("Readable:");
	await page.reload();
	await expect(row("Level plans")).toContainText("Ready");
	log.step("Replaced the broken link; checked again: Ready");

	await row("Prototype build").getByRole("button", { name: "Delete artifact" }).click();
	await page.getByRole("button", { name: "Yes" }).click();
	await expect(page.getByText("Artifact deleted")).toBeVisible();
	await expect(row("Prototype build")).toHaveCount(0);
	log.step("Deleted an artifact");
});
