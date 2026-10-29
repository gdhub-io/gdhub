import { PaymentStatus } from "@gdhub-io/gdhub-prisma";
import { expect, test } from "@playwright/test";
import { prisma } from "../../../src/services/prisma";
import {
	activeCheckpoint,
	GOAL,
	payInPaddle,
	planCheckpoint,
} from "./support/purchase";
import { RunLog } from "./support/run-log";
import { grantUser, makeProject, removeRun, signInAs } from "./support/stand";

/**
 * GDHUB-79 B4: from the project's path the author plans an AI checkpoint, pays
 * in Paddle's sandbox, and Paddle's webhook (through ngrok) starts it.
 */

const log = new RunLog("B4 buy from the project");

test.afterAll(async () => {
	await log.write();
	await removeRun();
});

test("an AI checkpoint bought from the project space starts", async ({
	browser,
}) => {
	const author = await grantUser("author-b4");
	const page = await signInAs(browser, author);
	const project = await makeProject(page, "Tidebound");

	await page.goto(`/user/project/${project.slug}/workflow`);
	await page.getByRole("button", { name: "Plan this checkpoint" }).click();
	await page.waitForURL(/\/checkpoint\/new\?project=/);
	await planCheckpoint(page, "A playable greybox of one island with the tide loop");
	await expect(page.getByText("10–15 hours per sprint")).toBeVisible();
	await expect(page.getByText(GOAL)).toBeVisible();
	log.step("Planned: done so far, the goal, 10–15 h a sprint, the AI curator");

	await payInPaddle(page);
	log.step("Paid in Paddle's sandbox with the test card");

	const checkpoint = await activeCheckpoint(project.id);
	log.track(checkpoint.id);
	expect(checkpoint.goal).toBe(GOAL);
	expect(checkpoint.sessions).toHaveLength(5);
	expect(checkpoint.legalAcceptances.map((row) => row.code)).toContain(
		"CheckpointPurchaseTerms",
	);
	const payment = await prisma.payment.findUniqueOrThrow({
		where: { id: checkpoint.paymentId ?? "" },
		select: { status: true, amount: true, providerTransactionId: true },
	});
	expect(payment.status).toBe(PaymentStatus.COMPLETED);
	expect(payment.amount).toBeGreaterThan(0);
	log.step(`Active; payment ${payment.providerTransactionId} completed`);

	await expect(page.getByText("You're on your way")).toBeVisible({ timeout: 60_000 });
	// Since GDHUB-117 day 1 with the AI curator opens on its letter and the plan.
	await page.getByRole("button", { name: "Read the curator's letter" }).click();
	await page.waitForURL(/\/workflow\/cp1\?sprint=1&tab=plan$/);
	await expect(page.getByText(/Checkpoint 1/).first()).toBeVisible();
	log.step("The ready screen leads to the curator's letter on the plan");
});
