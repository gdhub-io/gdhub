import {
	CheckpointSessionContentStatus,
	PayableType,
	PaymentProvider,
	PaymentStatus,
} from "@gdhub-io/gdhub-prisma";
import { type Browser, expect, test } from "@playwright/test";
import { MS_PER_DAY } from "../../../src/lib/checkpoints/days";
import { refundedTotal } from "../../../src/repositories/checkpoints/refund";
import { prisma } from "../../../src/services/prisma";
import { activeCheckpoint, payInPaddle, planCheckpoint } from "./support/purchase";
import { RunLog } from "./support/run-log";
import {
	grantUser,
	makeProject,
	makeToday,
	refundAsAdmin,
	removeRun,
	runCron,
	signInAs,
	startWithoutPaying,
} from "./support/stand";

/**
 * GDHUB-79 D16, D17: refunds are an admin's, by hand. Inside 14 days a
 * withdrawal returns the price less the reviews already written, through
 * Paddle; after 14 days withdrawal is refused and an early "no verdict" too.
 */

const log = new RunLog("D refunds");

const buy = async (browser: Browser, label: string) => {
	const page = await signInAs(browser, await grantUser(label));
	const project = await makeProject(page, "Tidebound");
	await page.goto(`/checkpoint/new?project=${project.slug}`);
	await planCheckpoint(page, "A playable greybox of one island");
	await payInPaddle(page);
	const checkpoint = await activeCheckpoint(project.id);
	log.track(checkpoint.id);
	return { page, checkpoint };
};

test.afterAll(async () => {
	await log.write();
	await removeRun();
});

test("a withdrawal inside 14 days is refunded less the reviews written", async ({
	browser,
}) => {
	const { page, checkpoint } = await buy(browser, "author-d16");
	await makeToday(checkpoint.id, 8);
	await runCron(page);
	const review = await prisma.checkpointSession.findUniqueOrThrow({
		where: { checkpointId_index: { checkpointId: checkpoint.id, index: 2 } },
		select: { contentStatus: true },
	});
	expect(review.contentStatus).toBe(CheckpointSessionContentStatus.Ready);
	log.step("Day 8: the sprint 1 review is written");

	const admin = await signInAs(browser, await grantUser("admin-d16", "superAdmin"));
	const quote = await (
		await admin.request.get(`/api/admin/checkpoints/${checkpoint.id}/refund`)
	).json();
	log.step(`The quote: ${JSON.stringify(quote)}`);

	await refundAsAdmin(admin, "Tidebound", "Withdrawal within 14 days");

	const payment = await prisma.payment.findUniqueOrThrow({
		where: { id: checkpoint.paymentId ?? "" },
		select: { amount: true, refunds: { select: { amount: true } } },
	});
	const refunded = refundedTotal(payment.refunds);
	expect(refunded).toBeGreaterThan(0);
	expect(refunded).toBeLessThan(payment.amount);
	log.step(`Refunded ${refunded} of ${payment.amount} through Paddle`);
});

test("after 14 days a withdrawal is refused", async ({ browser }) => {
	// Only the payment's date matters here, so no Paddle: a paid row 15 days old.
	const author = await grantUser("author-d17");
	const page = await signInAs(browser, author);
	const checkpointId = await startWithoutPaying(
		page,
		await makeProject(page, "Tidebound"),
	);
	await prisma.payment.create({
		data: {
			amount: 2000,
			currency: "USD",
			status: PaymentStatus.COMPLETED,
			payableType: PayableType.CHECKPOINT,
			payableId: checkpointId,
			payerId: author.id,
			provider: PaymentProvider.PADDLE,
			// Never sent: both refusals come before Paddle is asked.
			providerTransactionId: "txn_e2e_never_sent",
			createdAt: new Date(Date.now() - 15 * MS_PER_DAY),
		},
	});

	const admin = await signInAs(browser, await grantUser("admin-d17", "superAdmin"));
	const refuse = async (reason: string) =>
		admin.request.post(`/api/admin/checkpoints/${checkpointId}/refund`, {
			data: { reason },
		});
	const withdrawal = await refuse("withdrawal");
	expect(withdrawal.status()).toBe(400);
	expect(await withdrawal.text()).toContain("withdrawalOver");
	const early = await refuse("noVerdict");
	expect(early.status()).toBe(400);
	expect(await early.text()).toContain("verdictNotOverdue");
	log.step("Day 16: withdrawal refused; no verdict refused until the verdict is overdue");
});
