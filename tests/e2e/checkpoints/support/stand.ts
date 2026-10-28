import {
	CheckpointItemKind,
	type ProjectArtifactType,
	TeamMemberStatus,
	UserRole,
} from "@gdhub-io/gdhub-prisma";
import {
	type Browser,
	type BrowserContext,
	expect,
	type Page,
	test,
} from "@playwright/test";
import type { LegalCode } from "../../../../src/config/legal/registry";
import { MS_PER_DAY } from "../../../../src/lib/checkpoint-days";
import { resolveLegal } from "../../../../src/lib/legal/accept";
import { versionInEffect } from "../../../../src/lib/legal/versions";
import { startAiCheckpoint } from "../../../../src/repositories/checkpoint-payment";
import { prisma } from "../../../../src/services/prisma";
import { becomePersona, type PersonaKey } from "../../../personas";
import { acceptCookieConsent } from "../../setup/cookies";

/**
 * The stand the checkpoint suite runs on: `bun run dev:test` on :3100 against
 * the throwaway database, `.env.test` for Paddle sandbox. Every user a flow
 * needs is made here under one run id and removed by `removeRun`, so flows
 * never share rows and a failed run leaves nothing a later one trips over.
 */

const RUN = Date.now().toString(36);
// Paddle refuses a `.local` address; example.com is reserved and delivers nothing.
const PREFIX = "cp-e2e-";
const DOMAIN = "example.com";
const contexts: BrowserContext[] = [];

export const IMAGE =
	"https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Fronalpstock_big.jpg/960px-Fronalpstock_big.jpg";
const VIDEO_ID = "aqz-KE-bpKQ";
export const VIDEO = `https://www.youtube.com/watch?v=${VIDEO_ID}`;

export const baseURL = () =>
	test.info().project.use.baseURL ?? "http://localhost:3100";

export type StandUser = { id: string; email: string; name: string };
type Project = Awaited<ReturnType<typeof makeProject>>;

/** What a form sends for the documents it ticked, at the version in effect. */
const accepted = (...codes: LegalCode[]) =>
	codes.map((code) => ({
		code,
		version: versionInEffect(code)?.version ?? 1,
	}));

export async function grantUser(
	label: string,
	persona: PersonaKey = "member",
	name = `${label[0].toUpperCase()}${label.slice(1)} E2E`,
): Promise<StandUser> {
	const email = `${PREFIX}${label}-${RUN}@${DOMAIN}`;
	const user = await prisma.user.create({
		data: {
			email,
			name,
			emailVerified: new Date(),
			onboardingDone: true,
			roles: [UserRole.Member],
			// A stub, so the JWT callback skips ensureMatrixUser.
			matrixUserId: `@${label}-${RUN}:matrix.local`,
			// Old enough to buy: a checkpoint is sold at 18.
			profile: { create: { name, yearOfBirth: 1990 } },
		},
		select: { id: true, email: true, name: true },
	});
	await becomePersona(user.id, persona);
	// Signed up the usual way, so no re-acceptance modal stands in front.
	await prisma.legalAcceptance.createMany({
		data: resolveLegal(accepted("TermsOfUse"), ["TermsOfUse"], {
			userId: user.id,
			context: "SignUp",
			meta: { ipAddress: null, userAgent: "playwright" },
		}),
	});

	return { id: user.id, email, name };
}

export async function signInAs(browser: Browser, user: StandUser) {
	const context = await browser.newContext({ baseURL: baseURL() });
	contexts.push(context);
	const page = await context.newPage();
	await acceptCookieConsent(page, baseURL());

	const { csrfToken } = (await (
		await page.request.get("/api/auth/csrf")
	).json()) as { csrfToken: string };
	const signedIn = await page.request.post(
		"/api/auth/callback/e2e-credentials",
		{
			form: {
				csrfToken,
				email: user.email,
				callbackUrl: `${baseURL()}/hub`,
				json: "true",
			},
		},
	);
	expect(signedIn.ok()).toBe(true);

	return page;
}

/**
 * Someone who has just confirmed their email: a user row and nothing else —
 * no name, no profile, no onboarding, no terms accepted yet.
 */
export async function signUp(browser: Browser, label: string) {
	const user = await prisma.user.create({
		data: {
			email: `${PREFIX}${label}-${RUN}@${DOMAIN}`,
			emailVerified: new Date(),
			matrixUserId: `@${label}-${RUN}:matrix.local`,
		},
		select: { id: true, email: true },
	});

	return signInAs(browser, { ...user, email: user.email ?? "", name: "" });
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

/** The nightly run, now. */
export async function runCron(page: Page) {
	const response = await page.request.get("/api/cron/checkpoints", {
		headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
		timeout: 300_000,
	});
	expect(response.ok(), await response.text()).toBe(true);

	return response.json();
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

/**
 * Everything this run made — and whatever an interrupted run left over an
 * hour ago. Not the app's `deleteProject`: it refuses a project with vested
 * equity or a team history, which is exactly what these flows leave.
 */
export async function removeRun() {
	await Promise.all(contexts.splice(0).map((context) => context.close()));

	const users = await prisma.user.findMany({
		where: {
			email: { startsWith: PREFIX, endsWith: `@${DOMAIN}` },
			OR: [
				{ email: { contains: `-${RUN}@` } },
				{ createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } },
			],
		},
		select: { id: true },
	});
	const ids = users.map((user) => user.id);
	if (ids.length === 0) return;

	const ofTheirProjects = { equity: { project: { authorId: { in: ids } } } };
	// Equity is Restrict on the project and its transactions on the
	// allocations, so they go first.
	await prisma.equityTransaction.deleteMany({
		where: {
			OR: [
				{ toAllocation: ofTheirProjects },
				{ fromAllocation: ofTheirProjects },
			],
		},
	});
	await prisma.projectEquity.deleteMany({
		where: { project: { authorId: { in: ids } } },
	});
	await prisma.project.deleteMany({ where: { authorId: { in: ids } } });
	await prisma.certificate.deleteMany({ where: { userId: { in: ids } } });
	await prisma.refund.deleteMany({
		where: { payment: { payerId: { in: ids } } },
	});
	await prisma.payment.deleteMany({ where: { payerId: { in: ids } } });
	await prisma.legalAcceptance.deleteMany({ where: { userId: { in: ids } } });
	await prisma.user.deleteMany({ where: { id: { in: ids } } });
}
