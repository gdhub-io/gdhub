import { CheckpointStatus, PaymentStatus } from "@gdhub-io/gdhub-prisma";
import { expect, test } from "@playwright/test";
import { prisma } from "../../../src/services/prisma";
import { GAME } from "./support/game";
import {
	activeCheckpoint,
	openOverlay,
	payInPaddle,
	planCheckpoint,
} from "./support/purchase";
import { RunLog } from "./support/run-log";
import {
	grantUser,
	makeDraft,
	makeProject,
	removeRun,
	signInAs,
} from "./support/stand";

/**
 * GDHUB-79 B6, B8, B9: a checkout closed in Paddle leaves the checkpoint a
 * draft that can be paid again, and the purchase terms then sit in the
 * author's documents; a draft is discarded before anything is paid.
 */

const log = new RunLog("B6 B8 B9 drafts and terms");

const draftOf = (projectId: string) =>
	prisma.projectCheckpoint.findFirst({
		where: { projectId },
		select: { id: true, status: true },
	});

test.afterAll(async () => {
	await log.write();
	await removeRun();
});

test("an abandoned checkout stays a draft and is paid again", async ({
	browser,
}) => {
	const author = await grantUser("author-b6");
	const page = await signInAs(browser, author);
	const project = await makeProject(page, GAME.name);

	await page.goto(`/checkpoint/new?project=${project.slug}`);
	await planCheckpoint(page, GAME.doneSoFar);
	const paddle = await openOverlay(page);
	await paddle.getByRole("textbox", { name: "ZIP/Postcode" }).waitFor();
	await paddle.getByRole("img", { name: "Close" }).click();
	await expect(page.locator("iframe[name=paddle_frame]")).toBeHidden();

	const draft = await draftOf(project.id);
	expect(draft?.status).toBe(CheckpointStatus.Draft);
	log.step("Closed Paddle's overlay: the checkpoint is still a draft");

	await page.goto(`/user/project/${project.slug}/workflow`);
	await expect(page.getByText("Draft", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Continue setup" }).click();
	await page.waitForURL(/\/checkpoint\/new\/checkout/);
	if (!page.url().includes("step=payment")) {
		await page.goto(`/checkpoint/new/checkout?project=${project.slug}&step=payment`);
	}
	await payInPaddle(page);
	const checkpoint = await activeCheckpoint(project.id);
	log.track(checkpoint.id);

	const payments = await prisma.payment.findMany({
		where: { payableId: checkpoint.id },
		select: { status: true },
		orderBy: { createdAt: "asc" },
	});
	expect(payments.map((row) => row.status)).toEqual([
		PaymentStatus.CANCELED,
		PaymentStatus.COMPLETED,
	]);
	log.step("Paid on the second try; the abandoned checkout is cancelled");

	await page.goto("/user/settings/documents");
	// Each Pay records the terms, so a second try lists them twice (GDHUB-81).
	await expect(
		page.getByRole("row").filter({ hasText: "Checkpoint Purchase Terms" }).first(),
	).toBeVisible();
	log.step("The purchase terms are in My documents");
});

test("a draft is discarded before paying", async ({ browser }) => {
	const author = await grantUser("author-b9");
	const page = await signInAs(browser, author);
	const project = await makeProject(page, GAME.name);

	await makeDraft(page, project);
	const draft = await draftOf(project.id);
	expect(draft?.status).toBe(CheckpointStatus.Draft);

	await page.goto(`/user/project/${project.slug}/workflow`);
	await page.getByRole("button", { name: "More" }).click();
	await page.getByRole("menuitem", { name: "Cancel the checkpoint" }).click();
	await expect(page.getByText("Nothing was charged.")).toBeVisible();
	await page.getByRole("button", { name: "Cancel the draft" }).click();

	await expect.poll(() => draftOf(project.id)).toBeNull();
	await expect(page.getByRole("button", { name: "Plan this checkpoint" })).toBeVisible();
	log.step("Discarded the draft; the offer is back");
});
