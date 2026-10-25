import {
	CheckpointJournalKind,
	CheckpointStatus,
	CheckpointVerdict,
	ProjectArtifactType,
} from "@gdhub-io/gdhub-prisma";
import { expect, test } from "@playwright/test";
import { prisma } from "../../../src/services/prisma";
import { RunLog } from "./support/run-log";
import {
	addTasks,
	grantUser,
	makeProject,
	makeToday,
	prove,
	removeRun,
	runCron,
	signInAs,
	startWithoutPaying,
} from "./support/stand";

/**
 * GDHUB-79 C12: evidence that does not open misses the goal, whatever the
 * model proposes. The checkpoint is started without Paddle — the purchase is
 * B4's — and jumps straight to day 29.
 */

const log = new RunLog("C12 the verdict rule");

test.afterAll(async () => {
	await log.write();
	await removeRun();
});

test("an outcome whose evidence does not open misses the goal", async ({
	browser,
}) => {
	const page = await signInAs(browser, await grantUser("author-c12"));
	const project = await makeProject(page, "Tidebound");

	const checkpointId = await startWithoutPaying(page, project);
	log.track(checkpointId);

	const outcomes = await addTasks(page, checkpointId, [
		"A greybox build of the second island",
		"Playtest notes from five players",
	]);
	const links = [
		"https://github.com/godotengine/godot-demo-projects",
		"https://github.com/login",
	];
	for (const [index, link] of links.entries()) {
		await prove(page, project.id, checkpointId, outcomes[index].id, {
			type: ProjectArtifactType.Other,
			name: `Evidence ${index + 1}`,
			link,
		});
	}
	log.step("Two tasks: one proven by a public build, one by a link behind a login");

	await makeToday(checkpointId, 29);
	await runCron(page);

	const closed = await prisma.projectCheckpoint.findUniqueOrThrow({
		where: { id: checkpointId },
		select: { status: true, verdict: true },
	});
	expect(closed.status).toBe(CheckpointStatus.Closed);
	expect(closed.verdict).toBe(CheckpointVerdict.GoalMissed);
	const verdict = await prisma.checkpointJournalEntry.findFirstOrThrow({
		where: { checkpointId, kind: CheckpointJournalKind.Verdict },
		select: { output: true },
	});
	log.step(`Day 29: Goal missed by the rule — ${JSON.stringify(verdict.output)}`);
});
