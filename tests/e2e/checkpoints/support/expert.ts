import { CheckpointStatus } from "@gdhub-io/gdhub-prisma";
import { type Browser, expect, type Page } from "@playwright/test";
import { prisma } from "../../../../src/services/prisma";
import { payInPaddle, planCheckpoint } from "./purchase";
import {
	answerAsCurator,
	grantCurator,
	grantUser,
	makeProject,
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
 * A running checkpoint with an expert, the way an author gets one: planned on
 * the project's path with the expert named, paid in Paddle's sandbox, and taken
 * on by the expert. H1 and H2 walk these steps one by one; later flows start here.
 */
export async function expertCheckpoint(
	browser: Browser,
	label: string,
	projectName: string,
): Promise<ExpertCheckpoint> {
	const author = await grantUser(`author-${label}`);
	const curator = await grantCurator(`curator-${label}`);
	const authorPage = await signInAs(browser, author);
	const project = await makeProject(authorPage, projectName);

	await authorPage.goto(`/user/project/${project.slug}/workflow`);
	await authorPage.getByRole("button", { name: "Plan this checkpoint" }).click();
	await authorPage.waitForURL(/\/checkpoint\/new\?project=/);
	await planCheckpoint(authorPage, "A greybox with its core loop", curator.name);
	await payInPaddle(authorPage);

	await expect
		.poll(
			async () =>
				(
					await prisma.projectCheckpoint.findFirst({
						where: { projectId: project.id },
						select: { status: true },
					})
				)?.status,
			{ timeout: 90_000 },
		)
		.toBe(CheckpointStatus.AwaitingCurator);
	const { id: checkpointId } = await prisma.projectCheckpoint.findFirstOrThrow({
		where: { projectId: project.id },
		select: { id: true },
	});

	const curatorPage = await signInAs(browser, curator);
	await answerAsCurator(curatorPage, true);
	await statusBecomes(checkpointId, CheckpointStatus.Active);

	return { author, curator, authorPage, curatorPage, project, checkpointId };
}
