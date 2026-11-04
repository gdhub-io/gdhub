import { CheckpointStatus, PaymentStatus } from "@gdhub-io/gdhub-prisma";
import { expect, type Page, test } from "@playwright/test";
import { CHECKPOINT_MINOR_UNITS } from "../../../src/config/checkpoint";
import { curatorPrice } from "../../../src/config/checkpoint-pricing";
import { prisma } from "../../../src/services/prisma";
import { buyWithExpert } from "./support/expert";
import { GAME } from "./support/game";
import { RunLog } from "./support/run-log";
import {
	answerAsCurator,
	grantCurator,
	grantUser,
	handTo,
	makeProject,
	removeRun,
	type StandUser,
	signInAs,
} from "./support/stand";

/**
 * GDHUB-116 H2: a paid expert checkpoint changes hands. The author replaces the
 * expert who has not answered; the new one turns it down and the money stays
 * with the checkpoint; the author hands it back to the first, who takes it on —
 * paid once, throughout.
 */

const log = new RunLog("H2 expert replaced and declined");

let author: StandUser;
let first: StandUser;
let second: StandUser;
let authorPage: Page;
let projectSlug: string;
let checkpointId: string;

const checkpoint = () =>
	prisma.projectCheckpoint.findUniqueOrThrow({
		where: { id: checkpointId },
		select: {
			status: true,
			curatorId: true,
			curatorDeclinedAt: true,
			paymentId: true,
		},
	});

const paymentsOf = () =>
	prisma.payment.findMany({
		where: { payableId: checkpointId },
		select: { status: true },
	});

test.describe.serial("an expert checkpoint changing hands", () => {
	test.afterAll(async () => {
		await log.write();
		await removeRun();
	});

	test("bought with the first expert", async ({ browser }) => {
		[author, first, second] = await Promise.all([
			grantUser("author-h2"),
			grantCurator("first-h2"),
			grantCurator("second-h2"),
		]);
		authorPage = await signInAs(browser, author);
		const project = await makeProject(authorPage, GAME.name);
		projectSlug = project.slug;

		checkpointId = await buyWithExpert(
			authorPage,
			project,
			GAME.doneSoFar,
			first.name,
		);
		// Paddle charges every checkpoint at the AI price for now: an expert's price
		// arrives with their seller (GDHUB-107). The money held is set to what an
		// expert checkout will charge, so changing hands is judged on the right sum.
		await prisma.payment.updateMany({
			where: { payableId: checkpointId },
			data: { amount: curatorPrice("Experienced") * CHECKPOINT_MINOR_UNITS },
		});
		log.track(checkpointId);
		log.step(`Paid with ${first.name}; waiting for their answer`);
	});

	test("replaced before they answer", async () => {
		await handTo(authorPage, projectSlug, second.name, "Replace the curator");

		await expect.poll(async () => (await checkpoint()).curatorId).toBe(second.id);
		expect((await checkpoint()).status).toBe(CheckpointStatus.AwaitingCurator);
		log.step(`Handed to ${second.name} before ${first.name} answered`);
	});

	test("turned down by the second expert", async ({ browser }) => {
		await answerAsCurator(await signInAs(browser, second), false);

		await expect
			.poll(async () => (await checkpoint()).status, { timeout: 30_000 })
			.toBe(CheckpointStatus.Draft);
		const declined = await checkpoint();
		expect(declined.curatorDeclinedAt).not.toBeNull();
		// The money stays, held: the author picks another expert, or cancels for a refund.
		expect((await paymentsOf()).map((row) => row.status)).toEqual([
			PaymentStatus.PROCESSING,
		]);

		await authorPage.goto(`/checkpoint/new/checkout?project=${projectSlug}`);
		await expect(
			authorPage.getByText("This expert cannot take it on right now"),
		).toBeVisible();
		log.step(`${second.name} turned it down; the author is told, the money kept`);
	});

	test("handed back to the first expert, who takes it on", async ({ browser }) => {
		await handTo(authorPage, projectSlug, first.name, "Pick another curator");

		await expect
			.poll(async () => (await checkpoint()).status)
			.toBe(CheckpointStatus.AwaitingCurator);
		expect((await checkpoint()).curatorId).toBe(first.id);

		await answerAsCurator(await signInAs(browser, first), true);
		await expect
			.poll(async () => (await checkpoint()).status, { timeout: 30_000 })
			.toBe(CheckpointStatus.Active);
		// One payment, from the purchase to the start.
		expect((await paymentsOf()).map((row) => row.status)).toEqual([
			PaymentStatus.COMPLETED,
		]);
		log.step(`${first.name} took it on; paid once throughout`);
	});
});
