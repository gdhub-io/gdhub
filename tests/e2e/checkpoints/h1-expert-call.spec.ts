import {
	CheckpointSessionContentStatus,
	CheckpointStatus,
} from "@gdhub-io/gdhub-prisma";
import { expect, type Page, test } from "@playwright/test";
import { callRoomName } from "../../../src/lib/checkpoints/call";
import { prisma } from "../../../src/services/prisma";
import { finishCall, roomState } from "./support/daily";
import { GOAL, payInPaddle, planCheckpoint } from "./support/purchase";
import { RunLog } from "./support/run-log";
import {
	grantCurator,
	grantUser,
	makeProject,
	removeRun,
	runCallsCron,
	type StandUser,
	signInAs,
} from "./support/stand";

/**
 * GDHUB-116 H1: an author buys a checkpoint with an industry expert, the expert
 * takes it on, and call 1 runs — the expert in first, the team let in, the
 * call ended for everyone — until its notes are written from the transcript.
 * Daily is emulated on the stand; its webhooks are signed here.
 */

const log = new RunLog("H1 expert and call 1");

let author: StandUser;
let curator: StandUser;
let authorPage: Page;
let curatorPage: Page;
let projectSlug: string;
let checkpointId: string;

const checkpointOf = () =>
	prisma.projectCheckpoint.findUniqueOrThrow({
		where: { id: checkpointId },
		select: { status: true, curatorId: true },
	});

const call1 = () => ({ checkpointId_index: { checkpointId, index: 1 } });
const session = () =>
	prisma.checkpointSession.findUniqueOrThrow({
		where: call1(),
		select: {
			curatorJoinedAt: true,
			endedAt: true,
			contentStatus: true,
			content: true,
		},
	});

test.describe.serial("a checkpoint with an expert", () => {
	test.afterAll(async () => {
		await log.write();
		await removeRun();
	});

	test("bought with an expert, waiting for their answer", async ({ browser }) => {
		author = await grantUser("author-h1");
		curator = await grantCurator("curator-h1");
		authorPage = await signInAs(browser, author);
		const project = await makeProject(authorPage, "Reefline");
		projectSlug = project.slug;

		await authorPage.goto(`/user/project/${project.slug}/workflow`);
		await authorPage.getByRole("button", { name: "Plan this checkpoint" }).click();
		await authorPage.waitForURL(/\/checkpoint\/new\?project=/);
		await planCheckpoint(authorPage, "A greybox reef with one diving loop", curator.name);
		await expect(authorPage.getByText(GOAL)).toBeVisible();
		await payInPaddle(authorPage);

		await expect
			.poll(
				async () =>
					(
						await prisma.projectCheckpoint.findFirst({
							where: { projectId: project.id },
							select: { id: true, status: true },
						})
					)?.status,
				{ timeout: 90_000 },
			)
			.toBe(CheckpointStatus.AwaitingCurator);
		const checkpoint = await prisma.projectCheckpoint.findFirstOrThrow({
			where: { projectId: project.id },
			select: { id: true, curatorId: true },
		});
		checkpointId = checkpoint.id;
		expect(checkpoint.curatorId).toBe(curator.id);
		log.track(checkpointId);
		log.step("Paid with the expert; the checkpoint waits for their answer");
	});

	test("the expert takes it on", async ({ browser }) => {
		curatorPage = await signInAs(browser, curator);
		await curatorPage.goto("/advisor/checkpoints");
		// An advisor who has not accepted the Advisor Agreement is asked to on the
		// way in (a TBD text, published on the stand only).
		const terms = curatorPage.getByRole("dialog").filter({
			hasText: "Please accept our terms",
		});
		await terms.getByRole("checkbox", { name: /I accept the Advisor Agreement/ }).check();
		await terms.getByRole("button", { name: "Accept and continue" }).click();
		await expect(terms).toBeHidden();

		await curatorPage.getByRole("button", { name: "Review and answer" }).first().click();
		await curatorPage.getByRole("button", { name: "Take it on" }).click();

		await expect
			.poll(async () => (await checkpointOf()).status, { timeout: 30_000 })
			.toBe(CheckpointStatus.Active);
		expect(
			await prisma.legalAcceptance.count({
				where: { userId: curator.id, code: "AdvisorAgreement" },
			}),
		).toBe(1);
		log.step("The expert accepted the agreement and took it on; the checkpoint runs");
	});

	test("call 1: the expert in first, the team let in, ended for everyone", async () => {
		// The window opens 15 minutes before the call: it starts now.
		await prisma.checkpointSession.update({
			where: call1(),
			data: { scheduledAt: new Date() },
		});
		const room = callRoomName(checkpointId, 1);

		await authorPage.goto(`/user/project/${projectSlug}/workflow/cp1?sprint=1`);
		await expect(
			authorPage.getByRole("button", { name: /Waiting for .*…/ }),
		).toBeDisabled();
		log.step("Before the expert: the team waits");

		await curatorPage.goto(`/advisor/checkpoints/${checkpointId}/review/1`);
		await curatorPage.getByRole("button", { name: "Join call" }).click();
		// The dev server compiles each call route on its first use.
		await expect(
			curatorPage.getByRole("button", { name: "End call for everyone" }),
		).toBeVisible({ timeout: 30_000 });
		expect((await session()).curatorJoinedAt).not.toBeNull();

		await authorPage.getByRole("button", { name: "Join call" }).click({
			timeout: 30_000,
		});
		await expect(authorPage.getByRole("button", { name: "Leave call" })).toBeVisible({
			timeout: 30_000,
		});
		await expect
			.poll(async () => (await roomState(authorPage, room)).people.length)
			.toBe(2);
		log.step("The expert opened the call; the author was let in");

		await curatorPage.getByRole("button", { name: "End call for everyone" }).click();
		await curatorPage.getByRole("button", { name: "End call", exact: true }).click();
		await expect.poll(async () => (await roomState(authorPage, room)).open).toBe(false);
		await expect(authorPage.getByRole("button", { name: "Leave call" })).toBeHidden({
			timeout: 15_000,
		});
		expect((await session()).endedAt).not.toBeNull();
		log.step("The expert ended the call for everyone");
	});

	test("the notes of call 1, from its transcript", async () => {
		await finishCall(authorPage, callRoomName(checkpointId, 1));
		// Notes are written half an hour after a call ends.
		await prisma.checkpointSession.update({
			where: call1(),
			data: { endedAt: new Date(Date.now() - 31 * 60_000) },
		});
		await runCallsCron(authorPage);

		await expect
			.poll(async () => (await session()).contentStatus, { timeout: 120_000 })
			.toBe(CheckpointSessionContentStatus.Ready);
		expect((await session()).content).toBeTruthy();
		log.step("Daily's webhooks brought the transcript; the notes are ready");
	});
});
