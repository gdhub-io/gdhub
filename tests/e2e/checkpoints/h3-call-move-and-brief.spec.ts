import { CheckpointJournalKind } from "@gdhub-io/gdhub-prisma";
import { expect, test } from "@playwright/test";
import { prisma } from "../../../src/services/prisma";
import { type ExpertCheckpoint, expertCheckpoint } from "./support/expert";
import { GAME } from "./support/game";
import { RunLog } from "./support/run-log";
import { hoursFromNow, makeToday, removeRun, runCron } from "./support/stand";

/**
 * GDHUB-116 H3: in sprint 2 the author asks to move call 2 and the expert
 * agrees (GDHUB-90); the night before the call the AI writes the expert a brief
 * of sprint 1, which only they read (GDHUB-114).
 */

const log = new RunLog("H3 call moved and the brief");

let run: ExpertCheckpoint;

const call2 = () =>
	prisma.checkpointSession.findUniqueOrThrow({
		where: { checkpointId_index: { checkpointId: run.checkpointId, index: 2 } },
		select: { scheduledAt: true, moveTo: true },
	});

test.describe.serial("call 2 with an expert", () => {
	test.afterAll(async () => {
		await log.write();
		await removeRun();
	});

	test("a running checkpoint with an expert", async ({ browser }) => {
		run = await expertCheckpoint(browser, "h3", GAME.name);
		log.track(run.checkpointId);
		log.step("Bought with an expert, who took it on");
	});

	test("moved with the expert's approval", async () => {
		// Day 1 of sprint 2: call 2 may move within its first three days.
		await makeToday(run.checkpointId, 8);
		await prisma.checkpointSession.update({
			where: { checkpointId_index: { checkpointId: run.checkpointId, index: 2 } },
			data: { scheduledAt: hoursFromNow(6) },
		});

		await run.authorPage.goto(
			`/user/project/${run.project.slug}/workflow/cp1?sprint=2`,
		);
		await run.authorPage.getByRole("button", { name: "Move the call" }).click();
		const ask = run.authorPage.getByRole("dialog", { name: "Move call 2" });
		await ask.getByRole("button", { name: /^\d\d:\d\d$/ }).first().click();
		await ask.getByRole("button", { name: /^Ask .+ to move it$/ }).click();
		await expect(ask).toBeHidden();
		const asked = (await call2()).moveTo;
		expect(asked).not.toBeNull();
		log.step("The author asked to move call 2");

		await run.curatorPage.goto(`/advisor/checkpoints/${run.checkpointId}/review/2`);
		await expect(run.curatorPage.getByText(/asks to move this call to/)).toBeVisible({
			timeout: 30_000,
		});
		await run.curatorPage.getByRole("button", { name: "Move it" }).click();
		await expect.poll(async () => (await call2()).moveTo).toBeNull();
		expect((await call2()).scheduledAt).toEqual(asked);
		log.step("The expert agreed; call 2 moved");
	});

	test("the expert's brief of sprint 1, the night before", async () => {
		await prisma.checkpointSession.update({
			where: { checkpointId_index: { checkpointId: run.checkpointId, index: 2 } },
			data: { scheduledAt: hoursFromNow(3) },
		});
		const night = await runCron(run.authorPage);
		expect(night.briefs).toBe(1);
		expect(
			await prisma.checkpointJournalEntry.count({
				where: {
					checkpointId: run.checkpointId,
					kind: CheckpointJournalKind.Review,
					sprint: 1,
				},
			}),
		).toBe(1);

		await run.curatorPage.goto(
			`/advisor/checkpoints/${run.checkpointId}/review/2?tab=brief`,
		);
		await expect(
			run.curatorPage.getByText(/Sprint 1 as the AI read it · only you see this/),
		).toBeVisible({ timeout: 30_000 });
		log.step("The AI wrote the expert a brief of sprint 1");
	});
});
