import { expect, type Page, test } from "@playwright/test";
import { prisma } from "../../../src/services/prisma";
import { acceptCookieConsent } from "../setup/cookies";
import { activeCheckpoint, payInPaddle, planCheckpoint } from "./support/purchase";
import { RunLog } from "./support/run-log";
import {
	baseURL,
	grantUser,
	makeProject,
	removeRun,
	signInAs,
	signUp,
} from "./support/stand";

/**
 * GDHUB-79 B5: the checkpoint landing's three ways in. A new user fills in
 * who they are and makes the project inside the purchase; a signed-out user
 * is sent to sign in and back; a signed-in one goes straight on. The email
 * sign-in itself is not exercised: the stand signs in through the test
 * provider, so the new user starts right after confirming their email.
 */

const log = new RunLog("B5 buy from the landing");

const pick = async (page: Page, label: string, option?: string) => {
	const select = page.getByLabel(label, { exact: true });
	await select.click();
	// The year list is long and virtual: typing brings the option into view.
	if (option) await select.pressSequentially(option);
	await page.keyboard.press("Enter");
};

const fromLanding = async (page: Page) => {
	await page.goto("/checkpoint");
	await page.getByRole("link", { name: "Plan my next Checkpoint" }).first().click();
};

test.afterAll(async () => {
	await log.write();
	await removeRun();
});

test("a new user: about, a new project, payment", async ({ browser }) => {
	const page = await signUp(browser, "newcomer-b5");
	await fromLanding(page);
	await page.waitForURL(/\/checkpoint\/new\/about/);

	await page.getByLabel("Name", { exact: true }).fill("Nadia Newcomer");
	await pick(page, "Year of Birth", "1995");
	await pick(page, "Field of Activity");
	await page.getByLabel("Specialty Name").fill("Game designer");
	await pick(page, "Level");
	await page.getByRole("checkbox", { name: /Terms of Use/ }).check();
	await page.getByRole("button", { name: "Save and continue" }).click();
	log.step("Told us about herself");

	await page.waitForURL(/\/checkpoint\/new(\/project)?(\?|$)/);
	if (!page.url().includes("/project")) {
		await page.getByRole("button", { name: "Fill in" }).click();
	}
	await page.getByRole("button", { name: "New project" }).first().click();
	const create = page.getByRole("dialog", { name: "New project" });
	await create.getByLabel("Title").fill("Saltmarsh");
	await create
		.getByLabel("What's the game about")
		.fill("A cosy fishing game on a tidal marsh where the catch changes with the moon.");
	await create.getByLabel("Genre").click();
	await page.locator(".ant-select-dropdown:visible .ant-select-item-option").first().click();
	for (const box of await create.getByRole("checkbox").all()) await box.check();
	await create.getByRole("button", { name: "Create project" }).click();
	await expect(create).toBeHidden({ timeout: 60_000 });
	log.step("Made the project inside the purchase");

	await planCheckpoint(page, "A pond with three fish and a rod that works");
	await payInPaddle(page);
	const project = await prisma.project.findFirstOrThrow({
		where: { name: "Saltmarsh", author: { email: { contains: "newcomer-b5" } } },
		select: { id: true },
	});
	log.track((await activeCheckpoint(project.id)).id);
	log.step("Paid; the checkpoint is active");
});

test("signed out: sent to sign in, back to the checkpoint", async ({
	browser,
}) => {
	const author = await grantUser("author-b5");
	await makeProject(await signInAs(browser, author), "Tidebound");

	const context = await browser.newContext({ baseURL: baseURL() });
	const anonymous = await context.newPage();
	await acceptCookieConsent(anonymous, baseURL());
	await fromLanding(anonymous);
	await anonymous.waitForURL(/\/registration\?intent=checkpoint/, {
		waitUntil: "commit",
	});
	await anonymous.getByRole("link", { name: "I already have an account" }).click();
	await anonymous.waitForURL(/\/signin\?callbackUrl=.*checkpoint%2Fnew/);
	log.step("Signed out: landing → registration → sign in, the checkpoint kept");

	// The email link is out of reach here; the test provider stands in for it.
	const page = await signInAs(browser, author);
	await page.goto(decodeURIComponent(anonymous.url().split("callbackUrl=")[1]));
	await page.waitForURL(/\/checkpoint\/new/);
	// Paying from here is B4's path: the project picked, the hub is the same.
	await expect(page.getByText("Tell us about your project")).toBeVisible();
	log.step("Signed in: back at the checkpoint hub with the project to pick");
});

test("signed in: straight to the hub", async ({ browser }) => {
	const author = await grantUser("author-b5c");
	const page = await signInAs(browser, author);
	await makeProject(page, "Tidebound");

	await fromLanding(page);
	await page.waitForURL(/\/checkpoint\/new(\?|$)/);
	await expect(page.getByText("Tell us about your project")).toBeVisible();
	log.step("Signed in: the landing leads straight to the checkpoint hub");
});
