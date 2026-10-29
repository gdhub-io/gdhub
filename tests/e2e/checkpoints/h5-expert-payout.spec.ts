import {
	CheckpointStatus,
	CheckpointVerdict,
	ExpertInvoicing,
} from "@gdhub-io/gdhub-prisma";
import { expect, type Page, test } from "@playwright/test";
import { previousMonth } from "../../../src/lib/checkpoints/costs";
import { MS_PER_DAY } from "../../../src/lib/checkpoints/days";
import { prisma } from "../../../src/services/prisma";
import {
	type ExpertCheckpoint,
	expertCheckpoint,
	intoReview,
	statusBecomes,
} from "./support/expert";
import { RunLog } from "./support/run-log";
import { grantUser, removeRun, signInAs } from "./support/stand";

/**
 * GDHUB-116 H5: the expert's verdict earns them a fee; the author rates the
 * assessment, which only admins read; a month on, an admin marks the expert's
 * payout paid and the expert sees it in their earnings.
 */

const log = new RunLog("H5 the expert's payout and the rating");

const PROJECT = "Ironmoss";
const REFERENCE = "GDH-E2E-H5";

let run: ExpertCheckpoint;

const feeOf = () =>
	prisma.checkpointFee.findFirst({
		where: { checkpointId: run.checkpointId, curatorId: run.curator.id },
		select: { id: true, amount: true, payoutId: true },
	});

const checkpointRow = (page: Page) =>
	page.getByRole("row").filter({ hasText: PROJECT });

test.describe.serial("an expert paid for a checkpoint", () => {
	test.afterAll(async () => {
		await log.write();
		await removeRun();
	});

	test("the verdict earns the expert a fee", async ({ browser }) => {
		run = await expertCheckpoint(browser, "h5", PROJECT);
		log.track(run.checkpointId);

		await intoReview(run);

		// H4 walks the verdict window; here the verdict is only the way to the money.
		const sent = await run.curatorPage.request.post(
			`/api/advisor/checkpoints/${run.checkpointId}/verdict`,
			{ data: { verdict: CheckpointVerdict.GoalMet, note: "The loop holds." } },
		);
		expect(sent.ok(), await sent.text()).toBe(true);
		await statusBecomes(run.checkpointId, CheckpointStatus.Closed);

		const fee = await feeOf();
		expect(fee?.amount).toBeGreaterThan(0);

		await run.curatorPage.goto("/advisor/earnings");
		await expect(checkpointRow(run.curatorPage)).toContainText("Earned", {
			timeout: 30_000,
		});
		log.step("The expert sent the verdict and sees the fee as earned");
	});

	test("the author rates the assessment", async () => {
		const page = run.authorPage;
		await page.goto(
			`/user/project/${run.project.slug}/workflow?results=${run.checkpointId}`,
		);
		const results = page.getByRole("dialog", { name: /results/i });
		await expect(results.getByText("Was this assessment any use?")).toBeVisible({
			timeout: 30_000,
		});
		await results.getByRole("radio").nth(3).click();
		await results.getByPlaceholder("What was right or wrong about it?").fill(
			"The calls were worth it.",
		);
		await results.getByRole("button", { name: "Send" }).click();
		await expect(results.getByText("Your rating", { exact: true })).toBeVisible();

		await expect
			.poll(() =>
				prisma.checkpointFeedback.findFirst({
					where: { checkpointId: run.checkpointId },
					select: { rating: true, comment: true },
				}),
			)
			.toEqual({ rating: 4, comment: "The calls were worth it." });
		log.step("The author gave four stars and a comment");
	});

	test("a month on, an admin pays the expert", async ({ browser }) => {
		// The checkpoint closed last month, so its fee falls due this one.
		const lastMonth = new Date(previousMonth(new Date()).getTime() + 14 * MS_PER_DAY);
		await prisma.checkpointFee.updateMany({
			where: { checkpointId: run.checkpointId },
			data: { earnedAt: lastMonth },
		});
		await prisma.expertProfile.update({
			where: { userId: run.curator.id },
			data: {
				payoutHolder: run.curator.name,
				payoutAccount: "LT121000011101001000",
				invoicing: ExpertInvoicing.SelfEmployed,
			},
		});

		const admin = await signInAs(browser, await grantUser("admin-h5", "superAdmin"));
		await admin.goto("/admin/payouts");
		const row = admin.getByRole("row").filter({ hasText: run.curator.name });
		await expect(row).toContainText("1 rating", { timeout: 30_000 });
		await row.getByRole("button", { name: "Actions" }).click();
		await admin.getByRole("menuitem", { name: "Mark paid" }).click();

		const modal = admin.getByRole("dialog", { name: /^Mark .+ paid$/ });
		await modal.getByLabel("Reference").fill(REFERENCE);
		await modal.getByRole("button", { name: /^Mark .+ paid$/ }).click();
		await expect(modal).toBeHidden({ timeout: 30_000 });
		await expect(row).toContainText(`ref ${REFERENCE}`);

		const fee = await feeOf();
		expect(fee?.payoutId).not.toBeNull();
		const payout = await prisma.curatorPayout.findUniqueOrThrow({
			where: { id: fee?.payoutId ?? "" },
			select: { amount: true, reference: true },
		});
		expect(payout).toEqual({ amount: fee?.amount, reference: REFERENCE });
		log.step("An admin saw the rating and marked the month paid");

		await run.curatorPage.goto("/advisor/earnings");
		await expect(checkpointRow(run.curatorPage)).toContainText("Paid", {
			timeout: 30_000,
		});
		await expect(run.curatorPage.getByText(REFERENCE)).toBeVisible();
		log.step("The expert sees the payout in their earnings");
	});
});
