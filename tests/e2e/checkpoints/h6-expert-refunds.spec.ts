import { CheckpointStatus } from "@gdhub-io/gdhub-prisma";
import { type Browser, expect, test } from "@playwright/test";
import { CHECKPOINT_PARTS } from "../../../src/config/checkpoint";
import { refundedTotal } from "../../../src/repositories/checkpoints/refund";
import { prisma } from "../../../src/services/prisma";
import { type ExpertCheckpoint, expertCheckpoint } from "./support/expert";
import { RunLog } from "./support/run-log";
import { grantUser, makeToday, removeRun, signInAs } from "./support/stand";

/**
 * GDHUB-116 H6: an admin refunds an expert checkpoint through Paddle — the
 * expert gone with no replacement, or the verdict overdue. Either way the
 * author gets back the parts the expert did not deliver, the checkpoint ends
 * as Cancelled, and the expert earns nothing for it.
 */

const log = new RunLog("H6 refunds with an expert");

/** The calls 1..`calls` held: the expert joined each of them. */
const heldCalls = (checkpointId: string, calls: number) =>
	prisma.checkpointSession.updateMany({
		where: { checkpointId, index: { lte: calls } },
		data: { curatorJoinedAt: new Date(), endedAt: new Date() },
	});

const refundAsAdmin = async (
	browser: Browser,
	label: string,
	project: string,
	reason: string | RegExp,
) => {
	const admin = await signInAs(browser, await grantUser(label, "superAdmin"));
	await admin.goto("/admin/checkpoints");
	await admin
		.getByRole("row")
		.filter({ hasText: project })
		.first()
		.getByRole("button", { name: "Actions" })
		.click();
	await admin.getByRole("menuitem", { name: "Refund payment" }).click();
	const dialog = admin.getByRole("dialog");
	await dialog.getByText(reason).click();
	await dialog.getByRole("button", { name: /^Refund / }).click();
	await expect(admin.getByText(/^Refunded /)).toBeVisible({ timeout: 60_000 });
};

/** Refunded the parts not delivered, the checkpoint cancelled, no fee. */
const expectRefunded = async (
	run: ExpertCheckpoint,
	project: string,
	delivered: number,
) => {
	const { status } = await prisma.projectCheckpoint.findUniqueOrThrow({
		where: { id: run.checkpointId },
		select: { status: true },
	});
	expect(status).toBe(CheckpointStatus.Cancelled);
	const payment = await prisma.payment.findFirstOrThrow({
		where: { payableId: run.checkpointId },
		select: { amount: true, refunds: { select: { amount: true } } },
	});
	const paid = payment.amount;
	const kept = Math.floor((paid * delivered) / CHECKPOINT_PARTS.Human);
	expect(refundedTotal(payment.refunds)).toBe(paid - kept);
	expect(
		await prisma.checkpointFee.count({ where: { checkpointId: run.checkpointId } }),
	).toBe(0);

	await run.curatorPage.goto("/advisor/earnings");
	await expect(
		run.curatorPage.getByRole("row").filter({ hasText: project }),
	).toContainText("No fee", { ignoreCase: true, timeout: 30_000 });

	return { paid, refunded: paid - kept };
};

test.describe("refunds of an expert checkpoint", () => {
	test.afterAll(async () => {
		await log.write();
		await removeRun();
	});

	test("the expert is gone after call 1, with no replacement", async ({ browser }) => {
		const run = await expertCheckpoint(browser, "h6-gone", "Cinderwake");
		log.track(run.checkpointId);
		await makeToday(run.checkpointId, 10);
		await heldCalls(run.checkpointId, 1);

		await refundAsAdmin(browser, "admin-h6-gone", "Cinderwake", "Curator gone, no replacement");
		const { paid, refunded } = await expectRefunded(run, "Cinderwake", 1);
		log.step(`Curator gone after call 1: refunded ${refunded} of ${paid}; no fee`);
	});

	test("the verdict is overdue after the five calls", async ({ browser }) => {
		const run = await expertCheckpoint(browser, "h6-late", "Ashgrove");
		log.track(run.checkpointId);
		await heldCalls(run.checkpointId, 5);
		// Due on day 28, with three days to write it: day 33 is past them.
		await makeToday(run.checkpointId, 33);

		await refundAsAdmin(browser, "admin-h6-late", "Ashgrove", /^No verdict by day/);
		const { paid, refunded } = await expectRefunded(run, "Ashgrove", 5);
		log.step(`No verdict after five calls: refunded ${refunded} of ${paid}; no fee`);
	});
});
