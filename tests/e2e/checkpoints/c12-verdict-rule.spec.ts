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
 * GDHUB-79 C12, under the cautious-optimist rule (GDHUB-81): evidence that
 * shows something other than its task, and a link that leads nowhere, are not
 * delivered, and the goal is missed whatever the model proposes. Started
 * without Paddle — the purchase is B4's — and straight to day 29.
 */

const log = new RunLog("C12 the verdict rule");

test.afterAll(async () => {
	await log.write();
	await removeRun();
});

test("evidence of something else, or a dead link, misses the goal", async ({
	browser,
}) => {
	const page = await signInAs(browser, await grantUser("author-c12"));
	const project = await makeProject(page, "Tidebound");

	const checkpointId = await startWithoutPaying(page, project);
	log.track(checkpointId);

	const outcomes = await addTasks(page, checkpointId, [
		"Playtest notes from five players on the tide loop",
		"A greybox build of the second island",
	]);
	const links = [
		// A general reference page: opens, but is not five players' notes.
		"https://en.wikipedia.org/wiki/Godot_(game_engine)",
		"https://github.com/gdhub-io/no-such-repository-e2e",
	];
	for (const [index, link] of links.entries()) {
		await prove(page, project.id, checkpointId, outcomes[index].id, {
			type: ProjectArtifactType.Other,
			name: `Evidence ${index + 1}`,
			link,
		});
	}
	log.step("Two tasks: one with evidence of something else, one with a dead link");

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
	const { unproven } = verdict.output as { unproven: { reason: string }[] };
	// The dead link is the platform's fact; the mismatch is the model's reading.
	expect(unproven.map((task) => task.reason)).toContain("broken");
	log.step(`Day 29: Goal missed — ${JSON.stringify(verdict.output)}`);
});
