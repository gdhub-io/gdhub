import { ProjectArtifactType } from "@gdhub-io/gdhub-prisma";
import { expect, test } from "@playwright/test";
import { prisma } from "../../../src/services/prisma";
import { RunLog } from "./support/run-log";
import {
	grantUser,
	hireMember,
	makeProject,
	removeRun,
	signInAs,
} from "./support/stand";

/**
 * GDHUB-79 E18: a hired team member sees the project's path and artifacts but
 * cannot plan a checkpoint, move the stage or add an artifact; someone outside
 * the team gets a 404.
 */

const log = new RunLog("E18 team member and stranger");

test.afterAll(async () => {
	await log.write();
	await removeRun();
});

test("a team member looks, a stranger gets a 404", async ({ browser }) => {
	const author = await grantUser("author-e18");
	const member = await grantUser("member-e18");
	const stranger = await grantUser("stranger-e18");

	const project = await makeProject(await signInAs(browser, author), "Tidebound");
	await hireMember(project, member);
	await prisma.projectArtifact.create({
		data: {
			projectId: project.id,
			type: ProjectArtifactType.Concept,
			name: "Concept document",
			link: "https://example.com/",
			stepId: project.workflow?.currentStepId,
			createdById: author.id,
		},
	});

	const asMember = await signInAs(browser, member);
	await asMember.goto(`/user/project/${project.slug}/workflow`);
	await expect(asMember.getByText("You are here")).toBeVisible();
	await expect(asMember.getByRole("button", { name: "Plan this checkpoint" })).toHaveCount(0);
	await asMember.getByRole("button", { name: /Current stage/ }).click();
	await expect(asMember.getByRole("button", { name: "Next", exact: true })).toHaveCount(0);
	const move = await asMember.request.put("/api/project/move", {
		data: { projectId: project.id, direction: "next" },
	});
	expect(move.status()).toBe(403);
	log.step("Member: sees the path; no checkpoint offer, no Next; the move is refused (403)");

	await asMember.goto(`/user/project/${project.slug}/artifacts`);
	await expect(asMember.getByText("Concept document")).toBeVisible();
	await expect(asMember.getByRole("button", { name: "Add artifact" })).toHaveCount(0);
	log.step("Member: sees the artifacts; cannot add one");

	const asStranger = await signInAs(browser, stranger);
	const response = await asStranger.goto(`/user/project/${project.slug}/workflow`);
	expect(response?.status()).toBe(404);
	log.step("Stranger: 404 on the project space");
});
