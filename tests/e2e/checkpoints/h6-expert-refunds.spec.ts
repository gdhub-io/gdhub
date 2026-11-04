import { CheckpointStatus } from "@gdhub-io/gdhub-prisma";
import { expect, test } from "@playwright/test";
import { CHECKPOINT_PARTS } from "../../../src/config/checkpoint";
import { refundedTotal } from "../../../src/repositories/checkpoints/refund";
import { prisma } from "../../../src/services/prisma";
import { type ExpertCheckpoint, expertCheckpoint } from "./support/expert";
import { GAME } from "./support/game";
import { RunLog } from "./support/run-log";
import {
	grantUser,
	makeToday,
	refundAsAdmin,
	removeRun,
	signInAs,
} from "./support/stand";

// The admin finds each refund by its project, so the two carry their own names.
const GONE = `${GAME.name} H6 gone`;
const LATE = `${GAME.name} H6 late`;

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
		const run = await expertCheckpoint(browser, "h6-gone", GONE);
		log.track(run.checkpointId);
		await makeToday(run.checkpointId, 10);
		await heldCalls(run.checkpointId, 1);

		const admin = await signInAs(browser, await grantUser("admin-h6-gone", "superAdmin"));
		await refundAsAdmin(admin, GONE, "Curator gone, no replacement");
		const { paid, refunded } = await expectRefunded(run, GONE, 1);
		log.step(`Curator gone after call 1: refunded ${refunded} of ${paid}; no fee`);
	});

	test("the verdict is overdue after the five calls", async ({ browser }) => {
		const run = await expertCheckpoint(browser, "h6-late", LATE);
		log.track(run.checkpointId);
		await heldCalls(run.checkpointId, 5);
		// Due on day 28, with three days to write it: day 33 is past them.
		await makeToday(run.checkpointId, 33);

		const admin = await signInAs(browser, await grantUser("admin-h6-late", "superAdmin"));
		await refundAsAdmin(admin, LATE, /^No verdict by day/);
		const { paid, refunded } = await expectRefunded(run, LATE, 5);
		log.step(`No verdict after five calls: refunded ${refunded} of ${paid}; no fee`);
	});
});
