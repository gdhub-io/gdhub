import { CheckpointStatus } from "@gdhub-io/gdhub-prisma";
import { type Browser, expect, type Page } from "@playwright/test";
import { MS_PER_HOUR } from "../../../../src/lib/checkpoints/days";
import { prisma } from "../../../../src/services/prisma";
import { payInPaddle, planCheckpoint } from "./purchase";
import {
	answerAsCurator,
	grantCurator,
	grantUser,
	makeProject,
	makeToday,
	runCron,
	type StandUser,
	signInAs,
} from "./stand";

export type ExpertCheckpoint = {
	author: StandUser;
	curator: StandUser;
	authorPage: Page;
	curatorPage: Page;
	project: { id: string; slug: string };
	checkpointId: string;
};

/** The status of a checkpoint, polled until it is `status`. */
export const statusBecomes = (checkpointId: string, status: CheckpointStatus) =>
	expect
		.poll(
			async () =>
				(
					await prisma.projectCheckpoint.findUnique({
						where: { id: checkpointId },
						select: { status: true },
					})
				)?.status,
			{ timeout: 90_000 },
		)
		.toBe(status);

/**
 * The author plans the project's checkpoint with `expert` named and pays in
 * Paddle's sandbox; its id, once it waits for the expert's answer.
 */
export async function buyWithExpert(
	page: Page,
	project: { id: string; slug: string },
	doneSoFar: string,
	expert: string,
) {
	await page.goto(`/user/project/${project.slug}/workflow`);
	await page.getByRole("button", { name: "Plan this checkpoint" }).click();
	await page.waitForURL(/\/checkpoint\/new\?project=/);
	await planCheckpoint(page, doneSoFar, expert);
	await payInPaddle(page);

	let checkpointId = "";
	await expect
		.poll(
			async () => {
				const row = await prisma.projectCheckpoint.findFirst({
					where: { projectId: project.id },
					select: { id: true, status: true },
				});
				checkpointId = row?.id ?? "";
				return row?.status;
			},
			{ timeout: 90_000 },
		)
		.toBe(CheckpointStatus.AwaitingCurator);
	return checkpointId;
}

/**
 * A running checkpoint with an expert, the way an author gets one: planned on
 * the project's path with the expert named, paid in Paddle's sandbox, and taken
 * on by the expert. H1 and H2 walk these steps one by one; later flows start here.
 */
export async function expertCheckpoint(
	browser: Browser,
	label: string,
	projectName: string,
): Promise<ExpertCheckpoint> {
	const [author, curator] = await Promise.all([
		grantUser(`author-${label}`),
		grantCurator(`curator-${label}`),
	]);
	const [authorPage, curatorPage] = await Promise.all([
		signInAs(browser, author),
		signInAs(browser, curator),
	]);
	const project = await makeProject(authorPage, projectName);
	const checkpointId = await buyWithExpert(
		authorPage,
		project,
		"A greybox with its core loop",
		curator.name,
	);

	await answerAsCurator(curatorPage, true);
	await statusBecomes(checkpointId, CheckpointStatus.Active);

	return { author, curator, authorPage, curatorPage, project, checkpointId };
}

/** Day 29: the final call is over and the night puts the checkpoint in review. */
export async function intoReview(run: ExpertCheckpoint) {
	await makeToday(run.checkpointId, 29);
	// Sending the verdict opens when the final call starts.
	await prisma.checkpointSession.update({
		where: { checkpointId_index: { checkpointId: run.checkpointId, index: 5 } },
		data: {
			scheduledAt: new Date(Date.now() - 3 * MS_PER_HOUR),
			endedAt: new Date(Date.now() - 2 * MS_PER_HOUR),
		},
	});
	const night = await runCron(run.authorPage);
	await statusBecomes(run.checkpointId, CheckpointStatus.Review);
	return night;
}
