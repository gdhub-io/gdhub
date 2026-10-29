import {
	CheckpointJournalKind,
	CheckpointStatus,
	CheckpointVerdict,
} from "@gdhub-io/gdhub-prisma";
import { expect, test } from "@playwright/test";
import { prisma } from "../../../src/services/prisma";
import { type ExpertCheckpoint, expertCheckpoint, statusBecomes } from "./support/expert";
import { RunLog } from "./support/run-log";
import { makeToday, removeRun, runCron } from "./support/stand";

/**
 * GDHUB-116 H4 (GDHUB-77, moved here from checkpoint-verdict.authed.spec.ts):
 * the 28 days are over; the night puts the checkpoint in review and writes the
 * AI's read beside the verdict window; the expert drafts, saves and sends the
 * verdict, journalled beside the AI's proposal; the author reads the results.
 */

const log = new RunLog("H4 the expert's verdict");

const REASONING =
	"The tide loop plays, but the slice was not shown to players. The playtest moves to the next checkpoint.";

let run: ExpertCheckpoint;

const closed = () =>
	prisma.projectCheckpoint.findUniqueOrThrow({
		where: { id: run.checkpointId },
		select: { status: true, verdict: true, verdictNote: true, verdictDraft: true },
	});

test.describe.serial("the verdict with an expert", () => {
	test.afterAll(async () => {
		await log.write();
		await removeRun();
	});

	test("day 29: in review, with the AI's read", async ({ browser }) => {
		run = await expertCheckpoint(browser, "h4", "Glassreef");
		log.track(run.checkpointId);

		await makeToday(run.checkpointId, 29);
		// The final call is over: sending the verdict opens when it starts.
		await prisma.checkpointSession.update({
			where: { checkpointId_index: { checkpointId: run.checkpointId, index: 5 } },
			data: {
				scheduledAt: new Date(Date.now() - 3 * 3_600_000),
				endedAt: new Date(Date.now() - 2 * 3_600_000),
			},
		});
		const night = await runCron(run.authorPage);
		expect(night.verdictReads).toBe(1);
		await statusBecomes(run.checkpointId, CheckpointStatus.Review);
		log.step("Day 29: in review; the AI read the four sprints for the expert");
	});

	test("the expert drafts the verdict beside the AI's read, and sends it", async () => {
		const page = run.curatorPage;
		await page.goto("/advisor/checkpoints");
		await page.getByRole("button", { name: "Write the verdict" }).click();

		const modal = page.getByRole("dialog", { name: /write the verdict/i });
		await expect(modal.getByText("The AI's read")).toBeVisible();
		await expect(
			modal.getByText("A reference for you. The decision and the words are yours."),
		).toBeVisible();

		// The AI's read may show the same chip: the option is the last of them.
		await modal.getByText("Goal missed", { exact: true }).last().click();
		await modal.getByRole("textbox").fill(REASONING);
		await modal.getByRole("button", { name: "Save draft" }).click();
		await expect(page.getByText("Draft saved").first()).toBeVisible();

		// A saved draft is there when the verdict is opened again.
		await modal.getByRole("button", { name: "Close" }).click();
		await page.getByRole("button", { name: "Write the verdict" }).click();
		await expect(modal.getByRole("textbox")).toHaveValue(REASONING);
		log.step("The expert saved a draft beside the AI's read");

		await modal.getByRole("button", { name: "Send the verdict" }).click();
		await page
			.getByRole("dialog")
			.getByRole("button", { name: /^(ok|send)/i })
			.last()
			.click();
		await expect(page.getByText("The verdict is sent").first()).toBeVisible();

		expect(await closed()).toMatchObject({
			status: CheckpointStatus.Closed,
			verdict: CheckpointVerdict.GoalMissed,
			verdictNote: REASONING,
			verdictDraft: null,
		});
		const verdicts = await prisma.checkpointJournalEntry.findMany({
			where: { checkpointId: run.checkpointId, kind: CheckpointJournalKind.Verdict },
			select: { output: true },
		});
		// The expert's verdict sits beside what the AI proposed.
		expect(verdicts.map((row) => (row.output as { by?: string }).by)).toContain("ai");
		log.step("The expert sent Goal missed; the AI's proposal stays in the journal");
	});

	test("the author reads the results and goes on", async () => {
		const page = run.authorPage;
		await page.goto(
			`/user/project/${run.project.slug}/workflow?results=${run.checkpointId}`,
		);
		const results = page.getByRole("dialog", { name: /results/i });
		await expect(results.getByText(REASONING)).toBeVisible({ timeout: 30_000 });
		await results.getByRole("button", { name: "Close" }).click();

		await expect(page.getByText("How do you go on?")).toBeVisible();
		await page.getByRole("button", { name: "Continue with stage tasks" }).click();
		await expect(page.getByText("How do you go on?")).toBeHidden();
		log.step("The author read the verdict and went on with the stage's tasks");
	});
});
