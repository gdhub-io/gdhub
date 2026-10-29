import { expect, test } from "@playwright/test";
import { prisma } from "../../../src/services/prisma";
import { RunLog } from "./support/run-log";
import {
	grantUser,
	moveNext,
	nextButton,
	postDevlog,
	removeRun,
	signInAs,
	stageOf,
} from "./support/stand";

/**
 * GDHUB-79 A1: a project made in the hub walks its path one way. Next stays
 * locked while the stage's required tasks are open, every move is confirmed
 * with "no way back", and an equity promise on the stage becomes an allocation
 * when the stage is left.
 */

const log = new RunLog("A1 project path");

test.afterAll(async () => {
	await log.write();
	await removeRun();
});

test("a project moves through its stages, one way", async ({ browser }) => {
	const author = await grantUser("author-a1");
	const page = await signInAs(browser, author);

	await page.goto("/hub");
	await page.getByRole("button", { name: /^new project$/i }).click();
	const create = page.getByRole("dialog", { name: "Create new game project" });
	await create.getByLabel("Title").fill("Tidebound");
	await create
		.getByLabel("What's the game about")
		.fill(
			"A co-op sailing roguelike: two players crew a small boat between islands that flood and drain with the tide.",
		);
	await create.getByLabel("Genre").click();
	await page.locator(".ant-select-item-option").first().click();
	for (const box of await create.getByRole("checkbox").all()) await box.check();
	await create.getByRole("button", { name: "Create" }).click();
	await page.waitForURL(/\/user\/project\/[^/]+$/, { timeout: 60_000 });

	const slug = page.url().split("/").pop() as string;
	const project = await prisma.project.findUniqueOrThrow({
		where: { slug },
		select: { id: true },
	});
	expect(await stageOf(project.id)).toBe("Ideation");
	log.step(`Created ${slug} on Ideation`);

	// Ideation requires the project settings; with them empty, Next is locked.
	await page.goto(`/user/project/${slug}/workflow`);
	await expect(await nextButton(page)).toBeDisabled();
	log.step("Next locked: the settings are not filled");

	await prisma.project.update({
		where: { id: project.id },
		data: {
			platform: "PC",
			setting: "Archipelago",
			visualStyle: "Low poly",
			audition: "Co-op players",
			coverImage: "https://cdn.sanity.io/images/e2e/cover.png",
		},
	});
	await page.reload();
	await (await moveNext(page, "Ideation", "Concepting"))
		.getByRole("button", { name: "Move to Concepting" })
		.click();
	await expect(page.getByText("Current stage").first()).toBeVisible();
	await expect.poll(() => stageOf(project.id)).toBe("Concepting");
	log.step("Ideation → Concepting, confirmed");

	// A promise made for Concepting is executed when the project leaves it.
	const { currentStepId: concepting } =
		await prisma.projectWorkflow.findUniqueOrThrow({
			where: { projectId: project.id },
			select: { currentStepId: true },
		});
	const equity = await prisma.projectEquity.upsert({
		where: { projectId: project.id },
		create: { projectId: project.id },
		update: {},
	});
	const allocation = await prisma.equityAllocation.upsert({
		where: { equityId_ownerId: { equityId: equity.id, ownerId: author.id } },
		create: { equityId: equity.id, ownerId: author.id, percentage: 10 },
		update: {},
	});
	await prisma.equityPromise.create({
		data: {
			allocationId: allocation.id,
			percentage: 5,
			targetStepId: concepting,
			createdById: author.id,
		},
	});

	await page.reload();
	const toPrototyping = await moveNext(page, "Concepting", "Prototyping");
	await expect(toPrototyping).toContainText("These equity promises become allocations");
	await toPrototyping.getByRole("button", { name: "Move to Prototyping" }).click();
	await expect.poll(() => stageOf(project.id)).toBe("Prototyping");
	const after = await prisma.equityAllocation.findUniqueOrThrow({
		where: { id: allocation.id },
		select: { percentage: true, promises: { select: { isExecuted: true } } },
	});
	expect(after.percentage).toBe(allocation.percentage + 5);
	expect(after.promises.every((promise) => promise.isExecuted)).toBe(true);
	log.step(`Concepting → Prototyping; the 5% promise became an allocation (${after.percentage}%)`);

	// Prototyping requires a devlog about the prototype.
	await page.reload();
	await expect(await nextButton(page)).toBeDisabled();
	await postDevlog(
		page,
		project.id,
		"The first greybox: one island, the tide comes in and goes out.",
	);
	await page.reload();
	await (await moveNext(page, "Prototyping", "Preparing a demo version"))
		.getByRole("button", { name: "Move to Preparing a demo version" })
		.click();
	await expect.poll(() => stageOf(project.id)).toBe("Preparing a demo version");
	log.step("Prototyping → Preparing a demo version after the devlog");

	// The path runs one way: there is no Back, and the server refuses one.
	await page.reload();
	await expect(page.getByRole("button", { name: /^(Back|Previous)$/ })).toHaveCount(0);
	const back = await page.request.put("/api/project/move", {
		data: { projectId: project.id, direction: "previous" },
	});
	expect(back.status()).toBe(400);
	log.step("No way back: the server refuses direction=previous");
});
