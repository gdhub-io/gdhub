import {
	CheckpointItemKind,
	CheckpointSessionContentStatus,
	CheckpointStatus,
	CheckpointVerdict,
	ProjectArtifactType,
} from "@gdhub-io/gdhub-prisma";
import { type Browser, expect, type Page, test } from "@playwright/test";
import { pulseToken } from "../../../src/lib/checkpoint-pulse-token";
import { prisma } from "../../../src/services/prisma";
import { activeCheckpoint, payInPaddle, planCheckpoint } from "./support/purchase";
import { RunLog } from "./support/run-log";
import {
	addTasks,
	baseURL,
	grantUser,
	hireMember,
	makeProject,
	makeToday,
	moveNext,
	postDevlog,
	prove,
	removeRun,
	runCron,
	type StandUser,
	signInAs,
	stageOf,
	VIDEO,
} from "./support/stand";

/**
 * GDHUB-79 C10–C15, E19, E20: a whole AI checkpoint with the real model, its
 * 28 days walked by shifting the dates and calling the nightly cron. The team
 * sets four tasks on day 1, proves three with artifacts, posts a devlog with
 * an image and a video every sprint, cuts the fourth task on day 15, and gets
 * a verdict on day 29. Then: the results, the rating, the certificate, the
 * next stage, Checkpoint 2's carried-over inputs, the admin's curator journal
 * and the scout's card.
 */

const log = new RunLog("C whole AI checkpoint");

const TASKS = [
	"A greybox build of two islands with the tide loop anyone can download",
	"A two-minute gameplay video of co-op sailing between the islands",
	"Playtest notes from five players on the tide loop",
	"A storyboard for the trailer",
];
const EVIDENCE = [
	{
		type: ProjectArtifactType.ExecutableBuild,
		name: "Greybox build",
		link: "https://github.com/godotengine/godot-demo-projects",
	},
	{
		type: ProjectArtifactType.GameplayVideo,
		name: "Co-op sailing, 2 min",
		link: VIDEO,
	},
	{
		type: ProjectArtifactType.Other,
		name: "Playtest notes",
		link: "https://en.wikipedia.org/wiki/Playtest",
	},
];
let author: StandUser;
let member: StandUser;
let page: Page;
let project: Awaited<ReturnType<typeof makeProject>>;
let checkpointId: string;

const outcomes = () =>
	prisma.checkpointItem.findMany({
		where: { checkpointId, kind: CheckpointItemKind.Outcome },
		orderBy: { order: "asc" },
		select: {
			id: true,
			text: true,
			cut: true,
			evidenceMatch: true,
		},
	});

const session = (index: number) =>
	prisma.checkpointSession.findUniqueOrThrow({
		where: { checkpointId_index: { checkpointId, index } },
		select: { contentStatus: true },
	});

const sprintDevlog = (text: string) =>
	postDevlog(page, project.id, text, true);

/** Today becomes `day`, and the night runs. */
const nightOf = async (day: number) => {
	await makeToday(checkpointId, day);
	const result = await runCron(page);
	log.step(`Day ${day}, the cron: ${JSON.stringify(result)}`);
	return result;
};

const confirmPulse = async (browser: Browser, week: number) => {
	const pulse = await prisma.checkpointPulse.findFirstOrThrow({
		where: { checkpointId, week, teamMember: { userId: member.id } },
		select: { id: true, confirmedAt: true },
	});
	expect(pulse.confirmedAt).toBeNull();

	// Opened from the letter: no session needed.
	const context = await browser.newContext({ baseURL: baseURL() });
	const pulsePage = await context.newPage();
	await pulsePage.goto(`/pulse/${pulseToken(pulse.id)}`);
	await pulsePage.getByRole("button", { name: "Yes, I was" }).click();
	await expect(pulsePage.getByText(/Thanks.*noted/)).toBeVisible();
	await context.close();
	log.step(`The member confirmed the week ${week} pulse from the link`);
};

test.describe.serial("a whole AI checkpoint", () => {
	test.afterAll(async () => {
		await log.write();
		await removeRun();
	});

	test("bought, with a team of two", async ({ browser }) => {
		author = await grantUser("author-c", "member", "Alex Author");
		member = await grantUser("member-c", "member", "Mia Member");
		page = await signInAs(browser, author);
		project = await makeProject(page, "Tidebound");
		await hireMember(project, member);

		await page.goto(`/checkpoint/new?project=${project.slug}`);
		await planCheckpoint(page, "A playable greybox of one island with the tide loop");
		await payInPaddle(page);
		checkpointId = (await activeCheckpoint(project.id)).id;
		log.track(checkpointId);
		log.step("Bought through Paddle; the checkpoint is active");
	});

	test("day 1: the curator's advice, four tasks, three proven", async () => {
		await page.goto(`/user/project/${project.slug}/workflow/cp1/review/1`);
		await expect
			.poll(async () => (await session(1)).contentStatus, { timeout: 120_000 })
			.toBe(CheckpointSessionContentStatus.Ready);
		log.step("Opened the plan; the curator advised on the tasks");

		const tasks = await addTasks(page, checkpointId, TASKS);
		expect(tasks.map((task) => task.text)).toEqual(TASKS);
		for (const [index, artifact] of EVIDENCE.entries()) {
			await prove(page, project.id, checkpointId, tasks[index].id, artifact);
		}
		await expect
			.poll(
				async () => (await outcomes()).filter((task) => task.evidenceMatch).length,
				{ timeout: 180_000 },
			)
			.toBe(3);
		log.step("Four tasks set; three proven by artifacts the AI looked at");

		await sprintDevlog("Sprint 1: the tide floods and drains one island; two players can crew the boat.");
	});

	test("sprint 1: pulses on day 7, the review on day 8", async ({ browser }) => {
		const day7 = await nightOf(7);
		expect(day7.pulses.asked).toBe(1);
		expect(day7.pulses.counted).toBe(1);
		await confirmPulse(browser, 1);

		const day8 = await nightOf(8);
		expect(day8.reviews).toBeGreaterThanOrEqual(1);
		expect((await session(2)).contentStatus).toBe(CheckpointSessionContentStatus.Ready);
		await page.goto(`/user/project/${project.slug}/workflow/cp1/review/2`);
		await expect(page.getByText(/Sprint 1/).first()).toBeVisible();
		log.step("The sprint 1 review is ready and readable");
	});

	test("sprint 2: day 15 cuts a task", async () => {
		await makeToday(checkpointId, 12);
		await sprintDevlog("Sprint 2: the second island, and the boat now takes damage on the reef.");
		await nightOf(14);
		const day15 = await nightOf(15);
		expect(day15.reviews).toBeGreaterThanOrEqual(1);

		const storyboard = (await outcomes())[3];
		const cut = await page.request.patch(`/api/checkpoint/${checkpointId}/plan`, {
			data: { op: "remove", itemId: storyboard.id },
		});
		expect(cut.ok(), await cut.text()).toBe(true);
		expect((await outcomes())[3].cut).toBe(true);
		log.step("Day 15: the storyboard task is cut, kept struck through");
	});

	test("sprints 3 and 4, and the verdict on day 29", async () => {
		await makeToday(checkpointId, 19);
		await sprintDevlog("Sprint 3: five players tried the tide loop; notes are in the playtest doc.");
		await nightOf(21);
		await nightOf(22);
		await makeToday(checkpointId, 26);
		await sprintDevlog("Sprint 4: polish, the build is up, and the video is cut.");
		await nightOf(28);
		await nightOf(29);

		const closed = await prisma.projectCheckpoint.findUniqueOrThrow({
			where: { id: checkpointId },
			select: { status: true, verdict: true, verdictNote: true },
		});
		expect(closed.status).toBe(CheckpointStatus.Closed);
		// Everything not cut is proven, so the rule never forces Goal missed.
		expect(closed.verdict).not.toBe(CheckpointVerdict.GoalMissed);
		log.step(`Day 29: ${closed.verdict} — ${closed.verdictNote}`);
	});

	test("after the verdict: results, rating, certificate, the next stage", async () => {
		await page.goto(`/user/project/${project.slug}/workflow?results=${checkpointId}`);
		await expect(page.getByRole("dialog", { name: "Checkpoint 1 results" })).toBeVisible();
		await page.keyboard.press("Escape");

		const rated = await page.request.post(`/api/checkpoint/${checkpointId}/feedback`, {
			data: { rating: 4, comment: "Clear about what was missing." },
		});
		expect(rated.ok(), await rated.text()).toBe(true);
		log.step("Read the results and rated the assessment");

		const certificate = await prisma.certificate.findFirstOrThrow({
			where: { checkpointId },
			select: { number: true },
		});
		await page.goto(`/verify/${certificate.number}`);
		await expect(page.getByText("Checkpoint").first()).toBeVisible();
		log.step(`Certificate ${certificate.number} verifies publicly`);

		await page.goto(`/user/project/${project.slug}/workflow`);
		await (await moveNext(page, "Prototyping", "Preparing a demo version"))
			.getByRole("button", { name: "Move to Preparing a demo version" })
			.click();
		await expect.poll(() => stageOf(project.id)).toBe("Preparing a demo version");
		log.step("Next was open after the verdict: on to Preparing a demo version");
	});

	test("Checkpoint 2 carries over what was proven", async () => {
		await page.goto(`/checkpoint/new?project=${project.slug}`);
		await page.getByRole("button", { name: "Fill in" }).click();
		await expect(page.getByText("Carried over from Checkpoint 1")).toBeVisible();
		// The proven outcomes come back as inputs with their artifacts.
		for (const artifact of EVIDENCE) {
			await expect(page.getByText(artifact.name).first()).toBeVisible();
		}
		log.step("Checkpoint 2 starts from the three proven outcomes");
	});

	test("the admin reads the journal; the scout sees the card", async ({ browser }) => {
		const admin = await signInAs(browser, await grantUser("admin-c", "superAdmin"));
		await admin.goto("/admin/checkpoints");
		const row = admin.getByRole("row").filter({ hasText: "Tidebound" }).first();
		await row.getByRole("button", { name: "Actions" }).click();
		await admin.getByRole("menuitem", { name: "Curator journal" }).click();
		const drawer = admin.getByRole("dialog", { name: /Curator journal/ });
		await drawer.getByText("Verdict", { exact: true }).first().click();
		await expect(drawer).toContainText(/Ready for the next stage|Goal met/);
		log.step("Admin: the curator journal holds the verdict");

		const scout = await signInAs(browser, await grantUser("scout-c", "scout"));
		await scout.goto("/scout/games");
		await scout.getByText("Tidebound").first().click();
		await scout.getByRole("tab", { name: "Workflow" }).click();
		const { verdict } = await prisma.projectCheckpoint.findUniqueOrThrow({
			where: { id: checkpointId },
			select: { verdict: true },
		});
		// Only "Ready for the next stage" closes the stage on the card; the model
		// may judge the outcomes met and the stage not done.
		const closed =
			verdict === CheckpointVerdict.StageClosed
				? "Prototyping closed after the Checkpoint 1 verdict · AI curator"
				: "Prototyping closed by its own tasks";
		await expect(scout.getByText(closed)).toBeVisible();
		log.step(`Scout: "${closed}"`);
	});
});
