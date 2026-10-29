import {
	CheckpointItemKind,
	CheckpointSessionContentStatus,
	CheckpointStatus,
	CheckpointVerdict,
	ProjectArtifactType,
} from "@gdhub-io/gdhub-prisma";
import { type Browser, expect, type Page, test } from "@playwright/test";
import { pulseToken } from "../../../src/lib/checkpoints/pulse-token";
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
	nextButton,
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
 * sets five tasks on day 1, proves three with evidence the AI reads and one
 * behind a login it takes on trust, posts a devlog with an image and a video
 * every sprint, cuts the fifth task on day 15, and gets a verdict on day 29. Then: the results, the rating, the certificate, the
 * next stage, Checkpoint 2's carried-over inputs, the admin's curator journal
 * and the scout's card.
 */

const log = new RunLog("C whole AI checkpoint");

// Evidence that really shows its task, so the verdict is the model's to give;
// the fourth sits behind a login and is taken on trust (GDHUB-81).
const TASKS = [
	"A public repository of the Godot demo projects the game builds on",
	"An animated reference video for the art style",
	"A reference article on what playtesting is, for the team to read",
	"A private design board for the team",
	"A storyboard for the trailer",
];
const EVIDENCE = [
	{
		type: ProjectArtifactType.Other,
		name: "Godot demo projects",
		link: "https://github.com/godotengine/godot-demo-projects",
	},
	{
		type: ProjectArtifactType.GameplayVideo,
		name: "Art style reference",
		link: VIDEO,
	},
	{
		type: ProjectArtifactType.Other,
		name: "How we playtest",
		link: "https://en.wikipedia.org/wiki/Playtest",
	},
	{
		type: ProjectArtifactType.Other,
		name: "Design board",
		link: "https://github.com/login",
	},
];
const TRUSTED = 3;
const CUT = 4;

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
			evidence: { select: { match: true } },
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
		await page.goto(`/user/project/${project.slug}/workflow/cp1?sprint=1`);
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
				async () => (await outcomes()).filter((task) =>
					task.evidence.some((piece) => piece.match),
				).length,
				{ timeout: 180_000 },
			)
			.toBeGreaterThanOrEqual(3);
		log.step("Five tasks set; four with evidence, three of them read by the AI");

		// Since GDHUB-117 the author sends the tasks for the AI's check and approves
		// the plan; until then a removed task is deleted rather than cut.
		const check = await page.request.post(`/api/checkpoint/${checkpointId}/plan/advice`);
		expect(check.ok(), await check.text()).toBe(true);
		const approve = await page.request.post(`/api/checkpoint/${checkpointId}/plan/approve`);
		expect(approve.ok(), await approve.text()).toBe(true);
		log.step("The tasks were checked and the plan approved");

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
		await page.goto(`/user/project/${project.slug}/workflow/cp1?sprint=2`);
		await expect(page.getByText(/Sprint 1/).first()).toBeVisible();
		log.step("The sprint 1 review is ready and readable");
	});

	test("sprint 2: day 15 cuts a task", async () => {
		await makeToday(checkpointId, 12);
		await sprintDevlog("Sprint 2: the second island, and the boat now takes damage on the reef.");
		await nightOf(14);
		const day15 = await nightOf(15);
		expect(day15.reviews).toBeGreaterThanOrEqual(1);

		const storyboard = (await outcomes())[CUT];
		const cut = await page.request.patch(`/api/checkpoint/${checkpointId}/plan`, {
			data: { op: "remove", itemId: storyboard.id },
		});
		expect(cut.ok(), await cut.text()).toBe(true);
		expect((await outcomes())[CUT].cut).toBe(true);
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
		// Every task is delivered or taken on trust, but the tasks are references
		// that do not build the slice: done tasks out of step with the goal miss it.
		expect(closed.verdict).toBe(CheckpointVerdict.GoalMissed);
		const settled = await prisma.checkpointJournalEntry.findFirstOrThrow({
			where: { checkpointId, kind: "Verdict" },
			select: { output: true },
		});
		const { trusted } = settled.output as { trusted: { text: string }[] };
		expect(trusted.map((task) => task.text)).toContain(TASKS[TRUSTED]);
		log.step(`Day 29: ${closed.verdict} — ${closed.verdictNote}`);
	});

	test("after the verdict: results, rating, certificate, the stage held", async () => {
		await page.goto(`/user/project/${project.slug}/workflow?results=${checkpointId}`);
		const results = page.getByRole("dialog", { name: "Checkpoint 1 results" });
		await expect(results).toBeVisible();
		await expect(
			results.locator("div").filter({ hasText: TASKS[TRUSTED] }).last(),
		).toContainText("On trust");
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

		// Only "Ready for the next stage" lets a project leave a stage a checkpoint
		// ran on (2026-10-26); a missed goal keeps it there.
		await page.goto(`/user/project/${project.slug}/workflow`);
		await expect(await nextButton(page)).toBeDisabled();
		expect(await stageOf(project.id)).toBe("Prototyping");
		log.step("Goal missed: Next stays locked and the project stays on Prototyping");
	});

	test("Checkpoint 2 carries over what was proven", async () => {
		await page.goto(`/checkpoint/new?project=${project.slug}`);
		await page.getByRole("button", { name: "Fill in" }).click();
		await expect(page.getByText("Carried over from Checkpoint 1")).toBeVisible();
		// The readable evidence comes back as inputs; the one behind a login does not.
		for (const artifact of EVIDENCE.slice(0, TRUSTED)) {
			await expect(page.getByText(artifact.name).first()).toBeVisible();
		}
		log.step("Checkpoint 2 starts from the three proven outcomes");
	});

	test("the admin reads the journal; the scout sees the card", async ({ browser }) => {
		const admin = await signInAs(browser, await grantUser("admin-c", "superAdmin"));
		await admin.goto("/admin/checkpoints");
		const row = admin.getByRole("row").filter({ hasText: "Tidebound" }).first();
		await row.getByRole("button", { name: "Curator journal" }).click();
		const drawer = admin.getByRole("dialog", { name: /Curator journal/ });
		await expect(drawer).toContainText(/Ready for the next stage|Goal met|Goal missed/);
		log.step("Admin: the curator journal holds the verdict");

		const scout = await signInAs(browser, await grantUser("scout-c", "scout"));
		await scout.goto("/scout/games");
		await scout.getByText("Tidebound").first().click();
		await scout.getByRole("tab", { name: "Workflow" }).click();
		const { verdict } = await prisma.projectCheckpoint.findUniqueOrThrow({
			where: { id: checkpointId },
			select: { verdict: true },
		});
		// The goal was missed, so the project is still on Prototyping and the card
		// shows no stage closed.
		expect(verdict).toBe(CheckpointVerdict.GoalMissed);
		await expect(scout.getByText("Prototyping").first()).toBeVisible();
		await expect(scout.getByText(/Prototyping closed/)).toHaveCount(0);
		log.step("Scout: Prototyping is still open after the missed goal");
	});
});
