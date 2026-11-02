import {
	CheckpointItemKind,
	CheckpointJournalKind,
	type ProjectArtifactType,
	SkillLevel,
	TeamMemberStatus,
} from "@gdhub-io/gdhub-prisma";
import { expect, type Page } from "@playwright/test";
import { startAiCheckpoint } from "@/services/checkpoints/flows/payment";
import { MS_PER_DAY, MS_PER_HOUR } from "../../../../src/lib/checkpoints/days";
import { selectableStageNames } from "../../../../src/repositories/project/workflow";
import { prisma } from "../../../../src/services/prisma";
import { accepted } from "../../setup/legal";
import { grantUser, RUN, type StandUser } from "../../setup/users";

/**
 * The stand the checkpoint suite runs on: `bun run dev:test` on :3100 against
 * the throwaway database, `.env.test` for Paddle sandbox. Users and sessions
 * come from `setup/users`.
 */

export { baseURL } from "../../setup/sign-in";
export {
	grantUser,
	removeRun,
	type StandUser,
	signInAs,
	signUp,
} from "../../setup/users";

export const IMAGE =
	"https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Fronalpstock_big.jpg/960px-Fronalpstock_big.jpg";
const VIDEO_ID = "aqz-KE-bpKQ";
export const VIDEO = `https://www.youtube.com/watch?v=${VIDEO_ID}`;

type Project = Awaited<ReturnType<typeof makeProject>>;

/**
 * An industry expert who can be bought for any stage: an approved curator with
 * an Experienced speciality, open to mentees, free every day around the clock
 * (UTC) so a first call can be booked whenever the test runs.
 */
export async function grantCurator(label: string): Promise<StandUser> {
	// Named for this run: a curator a stopped run left behind is listed too.
	const curator = await grantUser(label, "advisor", `Expert ${label} ${RUN}`);
	const direction = await prisma.workDirection.findFirstOrThrow({
		orderBy: { name: "asc" },
		select: { id: true },
	});
	const profile = {
		curation: true,
		curatorApprovedAt: new Date(),
		curatorStages: await selectableStageNames(),
	};
	await Promise.all([
		prisma.speciality.create({
			data: {
				userId: curator.id,
				name: "Game designer",
				specialization: "Systems design",
				level: SkillLevel.Experienced,
				workDirectionId: direction.id,
				isOpenForMentoring: true,
			},
		}),
		prisma.expertProfile.upsert({
			where: { userId: curator.id },
			create: { userId: curator.id, ...profile },
			update: profile,
		}),
		prisma.advisorAvailability.upsert({
			where: { userId: curator.id },
			create: {
				userId: curator.id,
				timeZone: "UTC",
				confirmedAt: new Date(),
				rules: {
					create: {
						weekdays: [0, 1, 2, 3, 4, 5, 6],
						ranges: [{ from: 0, to: 24 * 60 }],
					},
				},
			},
			update: {},
		}),
	]);
	return curator;
}

/**
 * The expert's way to a checkpoint request: the Advisor Agreement accepted on
 * the way in (a TBD text, on the stand only), then the request opened and
 * answered.
 */
export async function answerAsCurator(page: Page, accept: boolean) {
	await page.goto("/advisor/checkpoints");
	const terms = page.getByRole("dialog").filter({ hasText: "Please accept our terms" });
	const asked = await terms
		.waitFor({ state: "visible", timeout: 10_000 })
		.then(() => true)
		.catch(() => false);
	if (asked) {
		await terms.getByRole("checkbox", { name: /I accept the Advisor Agreement/ }).check();
		await terms.getByRole("button", { name: "Accept and continue" }).click();
		await expect(terms).toBeHidden();
	}
	await page.getByRole("button", { name: "Review and answer" }).first().click();
	await page.getByRole("button", { name: accept ? "Take it on" : "Turn down" }).click();
}

/** The author hands a paid checkpoint to another expert, first hour they offer. */
export async function handTo(page: Page, slug: string, expert: string, button: string) {
	await page.goto(`/checkpoint/new/checkout?project=${slug}`);
	await page.getByRole("button", { name: button }).click();
	const modal = page.getByRole("dialog", { name: "Replace the curator" });
	await modal.getByRole("row", { name: new RegExp(expert) }).first().click();
	await modal.getByRole("button", { name: /^\d\d:\d\d$/ }).first().click();
	await modal.getByRole("button", { name: "Hand it to them" }).click();
	await expect(modal).toBeHidden();
}



/** A project on Prototyping, the way the hub's "New project" makes it. */
export async function makeProject(page: Page, name: string) {
	const response = await page.request.post("/api/user/project", {
		data: {
			name,
			description:
				"A co-op sailing roguelike: two players crew a small boat between islands that flood and drain with the tide.",
			genre: "Roguelike",
			stage: "Prototyping",
			understandsNotAi: true,
			legal: accepted("ProjectRequirements"),
		},
		timeout: 60_000,
	});
	expect(response.ok(), await response.text()).toBe(true);
	const { slug } = (await response.json()) as { slug: string };

	return prisma.project.findUniqueOrThrow({
		where: { slug },
		select: {
			id: true,
			slug: true,
			team: { select: { id: true } },
			workflow: { select: { currentStepId: true } },
		},
	});
}

/** Hired onto the project's team: a member of its space, not its owner. */
export async function hireMember(project: Project, user: StandUser) {
	const speciality = await prisma.speciality.findFirstOrThrow({
		where: { userId: user.id },
		select: { id: true },
	});
	await prisma.teamMember.create({
		data: {
			userId: user.id,
			teamId: project.team?.id ?? "",
			specialityId: speciality.id,
			status: TeamMemberStatus.Hired,
			startedAt: new Date(),
		},
	});
}

/** A devlog post as the composer saves it: text, and an image and a video if asked. */
export async function postDevlog(
	page: Page,
	projectId: string,
	text: string,
	withMedia = false,
) {
	const media = [
		{ type: "image", data: { file: { url: IMAGE }, caption: "The tide out" } },
		{
			type: "embed",
			data: {
				service: "youtube",
				source: VIDEO,
				embed: `https://www.youtube.com/embed/${VIDEO_ID}`,
				width: 580,
				height: 320,
			},
		},
	];
	const response = await page.request.post("/api/user/project/report", {
		data: {
			projectId,
			content: "",
			contentEditor: {
				time: Date.now(),
				version: "2.31.0",
				blocks: [
					{ type: "paragraph", data: { text } },
					...(withMedia ? media : []),
				],
			},
		},
	});
	expect(response.ok(), await response.text()).toBe(true);
	if (!withMedia) return;

	// The AI reads the image and the video after the post is saved; a review run
	// before both are read would see a different sprint on every run.
	const { id } = await prisma.projectReport.findFirstOrThrow({
		where: { projectId },
		orderBy: { number: { sort: "desc", nulls: "last" } },
		select: { id: true },
	});
	await expect
		.poll(
			() =>
				prisma.checkpointJournalEntry.count({
					where: { devlogId: id, kind: CheckpointJournalKind.DevlogMedia },
				}),
			{ timeout: 120_000 },
		)
		.toBe(media.length);
}

export const stageOf = (projectId: string) =>
	prisma.projectWorkflow
		.findUniqueOrThrow({
			where: { projectId },
			select: { currentStep: { select: { name: true } } },
		})
		.then((workflow) => workflow.currentStep?.name);

/** The current stage's card opens to show its Next. */
export async function nextButton(page: Page) {
	await page.getByRole("button", { name: /Current stage/ }).click();
	return page.getByRole("button", { name: "Next", exact: true });
}

/** Next, and the "no way back" confirmation; returns the open dialog. */
export async function moveNext(page: Page, from: string, to: string) {
	await (await nextButton(page)).click();
	const dialog = page.getByRole("dialog", { name: `Move to ${to}?` });
	await expect(dialog).toContainText(`changes from ${from} to ${to}`);
	await expect(dialog).toContainText("There is no way back");
	return dialog;
}

/**
 * A running AI checkpoint without Paddle — for flows where the purchase is
 * not the point (B4 is the purchase). A draft as the entry step saves it,
 * started the way the webhook starts one.
 */
export async function startWithoutPaying(page: Page, project: Project) {
	const draft = await makeDraft(page, project);
	await prisma.projectCheckpoint.update({
		where: { id: draft },
		data: { goal: "A second island and a build anyone can open" },
	});
	await startAiCheckpoint(draft, null);

	return draft;
}

/** A draft with what is done so far, as the entry's project step saves it. */
export async function makeDraft(page: Page, project: Project) {
	const saved = await page.request.put("/api/checkpoint/entry/project", {
		data: {
			projectId: project.id,
			items: [{ text: "A playable greybox of one island", artifactId: null }],
		},
	});
	expect(saved.ok(), await saved.text()).toBe(true);

	const { id } = await prisma.projectCheckpoint.findFirstOrThrow({
		where: { projectId: project.id },
		select: { id: true },
	});
	return id;
}

/** Tasks set in the plan's window; returns the outcomes in order. */
export async function addTasks(
	page: Page,
	checkpointId: string,
	texts: string[],
) {
	for (const text of texts) {
		const added = await page.request.patch(
			`/api/checkpoint/${checkpointId}/plan`,
			{ data: { op: "add", text } },
		);
		expect(added.ok(), await added.text()).toBe(true);
	}

	return prisma.checkpointItem.findMany({
		where: { checkpointId, kind: CheckpointItemKind.Outcome },
		orderBy: { order: "asc" },
		select: { id: true, text: true },
	});
}

/** An artifact made on the project and attached as the task's evidence. */
export async function prove(
	page: Page,
	projectId: string,
	checkpointId: string,
	itemId: string,
	artifact: { type: ProjectArtifactType; name: string; link: string },
) {
	const created = await page.request.post("/api/user/project/artifacts", {
		data: { projectId, ...artifact },
	});
	expect(created.ok(), await created.text()).toBe(true);
	const { id } = (await created.json()) as { id: string };

	const attached = await page.request.post(
		`/api/checkpoint/${checkpointId}/evidence`,
		{ data: { artifactId: id, itemIds: [itemId] } },
	);
	expect(attached.ok(), await attached.text()).toBe(true);
}

/** A cron, now: the nightly run, or another by its path. */
export async function runCron(page: Page, path = "/api/cron/checkpoints") {
	const response = await page.request.get(path, {
		headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
		timeout: 300_000,
	});
	expect(response.ok(), await response.text()).toBe(true);

	return response.json();
}

/** A whole hour from now, `hours` ahead (or back, when negative). */
export const hoursFromNow = (hours: number) => {
	const at = new Date(Date.now() + hours * MS_PER_HOUR);
	at.setUTCMinutes(0, 0, 0);
	return at;
};

/** An admin refunds the project's checkpoint from the checkpoints list, for `reason`. */
export async function refundAsAdmin(
	admin: Page,
	project: string,
	reason: string | RegExp,
) {
	await admin.goto("/admin/checkpoints");
	await admin
		.getByRole("row")
		.filter({ hasText: project })
		.first()
		.getByRole("button", { name: "Actions" })
		.click();
	await admin.getByRole("menuitem", { name: "Refund payment" }).click();
	const dialog = admin.getByRole("dialog");
	await dialog.getByText(reason).click();
	await dialog.getByRole("button", { name: /^Refund / }).click();
	await expect(admin.getByText(/^Refunded /)).toBeVisible({ timeout: 60_000 });
}

/**
 * Moves a running checkpoint back in time so that today is its day `day`
 * (1 = the day it started). Everything the team and the curator wrote on the
 * project moves with it — devlogs, artifacts, pulses, reviews, the journal —
 * so time passes for the whole world at once and a devlog posted "today" stays
 * in the sprint it was posted in.
 */
export async function makeToday(checkpointId: string, day: number) {
	const checkpoint = await prisma.projectCheckpoint.findUniqueOrThrow({
		where: { id: checkpointId },
		select: { startedAt: true, projectId: true },
	});
	if (!checkpoint.startedAt) throw new Error("The checkpoint has not started");

	const shift =
		Date.now() - (day - 1) * MS_PER_DAY - checkpoint.startedAt.getTime();
	if (shift === 0) return;
	const interval = `${shift} milliseconds`;
	const { projectId } = checkpoint;

	await prisma.$transaction([
		prisma.$executeRaw`UPDATE "ProjectCheckpoint" SET "startedAt" = "startedAt" + ${interval}::interval, "dueAt" = "dueAt" + ${interval}::interval, "revisedAt" = "revisedAt" + ${interval}::interval WHERE id = ${checkpointId}`,
		prisma.$executeRaw`UPDATE "CheckpointSession" SET "scheduledAt" = "scheduledAt" + ${interval}::interval, "endedAt" = "endedAt" + ${interval}::interval WHERE "checkpointId" = ${checkpointId}`,
		prisma.$executeRaw`UPDATE "CheckpointPulse" SET "requestedAt" = "requestedAt" + ${interval}::interval, "confirmedAt" = "confirmedAt" + ${interval}::interval WHERE "checkpointId" = ${checkpointId}`,
		prisma.$executeRaw`UPDATE "CheckpointItem" SET "addedAt" = "addedAt" + ${interval}::interval WHERE "checkpointId" = ${checkpointId}`,
		prisma.$executeRaw`UPDATE "CheckpointJournalEntry" SET "createdAt" = "createdAt" + ${interval}::interval WHERE "checkpointId" = ${checkpointId}`,
		prisma.$executeRaw`UPDATE "ProjectReport" SET "publishedAt" = "publishedAt" + ${interval}::interval WHERE "projectId" = ${projectId}`,
		prisma.$executeRaw`UPDATE "ProjectArtifact" SET "createdAt" = "createdAt" + ${interval}::interval, "checkedAt" = "checkedAt" + ${interval}::interval WHERE "projectId" = ${projectId}`,
	]);
}

