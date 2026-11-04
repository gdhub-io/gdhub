import { expect, type Page, test } from "@playwright/test";
import { prisma } from "../../src/services/prisma";
import { GAME } from "./checkpoints/support/game";
import { hireMember, makeProject } from "./checkpoints/support/stand";
import { acceptCookieConsent } from "./setup/cookies";
import { baseURL } from "./setup/sign-in";
import {
	grantUser,
	removeRun,
	type StandUser,
	signInAs,
} from "./setup/users";

/**
 * GDHUB-135, a devlog outside any checkpoint: written in the composer, read on
 * its public page, applauded by someone else. And who may touch whose post
 * (GDHUB-136), asked of the running server, not of a mocked guard.
 */

const TEXT = GAME.devlog.sprint1;

test.describe.serial("a devlog, from writing to applause", () => {
	let author: StandUser;
	let teammate: StandUser;
	let reader: StandUser;
	let project: Awaited<ReturnType<typeof makeProject>>;
	let authorPage: Page;
	let postId: string;

	test.beforeAll(async ({ browser }) => {
		author = await grantUser("devlog-author");
		teammate = await grantUser("devlog-teammate");
		reader = await grantUser("devlog-reader");
		authorPage = await signInAs(browser, author);
		project = await makeProject(authorPage, GAME.name);
		await hireMember(project, teammate);
	});
	test.afterAll(removeRun);

	test("the author writes a post in the composer", async () => {
		await authorPage.goto(`/user/project/${project.slug}/devlog`);
		await authorPage.getByRole("button", { name: "Add post" }).click();

		const modal = authorPage.getByRole("dialog");
		const post = modal.getByRole("button", { name: "Post" });
		// Nothing to post yet.
		await expect(post).toBeDisabled();
		await modal.locator(".ce-paragraph").first().click();
		await authorPage.keyboard.type(TEXT);
		await post.click();
		await expect(modal).toBeHidden({ timeout: 30_000 });

		const saved = await prisma.projectReport.findFirstOrThrow({
			where: { projectId: project.id, authorId: author.id, isSystem: false },
			orderBy: { number: "desc" },
			select: { id: true, contentEditor: true },
		});
		// The composer saves EditorJS blocks; `content` stays empty.
		expect(JSON.stringify(saved.contentEditor)).toContain(TEXT);
		postId = saved.id;
	});

	test("someone else reads it on its public page and applauds", async ({
		browser,
	}) => {
		const page = await signInAs(browser, reader);
		await page.goto(`/devlog/${postId}`);
		await expect(page.getByText(TEXT)).toBeVisible();

		// The post shows its applause at the top and the bottom; both are one count.
		const applaud = page.getByRole("button", { name: "Applaud" }).first();
		await expect(applaud).toHaveAttribute("aria-pressed", "false");
		await applaud.click();
		await expect(applaud).toHaveAttribute("aria-pressed", "true");
		await expect.poll(() => prisma.applause.count({ where: { userId: reader.id } })).toBe(1);

		// Still applauded after a reload, and a second click takes it back.
		await page.reload();
		await expect(applaud).toHaveAttribute("aria-pressed", "true");
		await applaud.click();
		await expect(applaud).toHaveAttribute("aria-pressed", "false");
		await expect.poll(() => prisma.applause.count({ where: { userId: reader.id } })).toBe(0);
	});

	test("a signed-out visitor reads it but cannot applaud", async ({ browser }) => {
		const context = await browser.newContext();
		const page = await context.newPage();
		await acceptCookieConsent(page, baseURL());
		await page.goto(`/devlog/${postId}`);

		await expect(page.getByText(TEXT)).toBeVisible();
		await expect(page.getByRole("button", { name: "Applaud" })).toHaveCount(0);
		await context.close();
	});

	test("a teammate posts and deletes their own post, never the author's", async ({
		browser,
	}) => {
		const page = await signInAs(browser, teammate);

		const own = await page.request.post("/api/user/project/report", {
			data: { content: "Rigging sketches are in.", projectId: project.id },
		});
		expect(own.ok(), await own.text()).toBe(true);
		const ownPost = await prisma.projectReport.findFirstOrThrow({
			where: { projectId: project.id, authorId: teammate.id },
			select: { id: true },
		});

		const authors = await page.request.delete(
			`/api/user/project/report?id=${postId}`,
		);
		expect(authors.status()).toBe(403);
		expect(await prisma.projectReport.count({ where: { id: postId } })).toBe(1);

		const mine = await page.request.delete(
			`/api/user/project/report?id=${ownPost.id}`,
		);
		expect(mine.ok()).toBe(true);
	});

	test("someone outside the project can neither post nor delete", async ({
		browser,
	}) => {
		const page = await signInAs(browser, reader);

		const posted = await page.request.post("/api/user/project/report", {
			data: { content: "Not my project.", projectId: project.id },
		});
		expect(posted.status()).toBe(404);

		const deleted = await page.request.delete(
			`/api/user/project/report?id=${postId}`,
		);
		expect(deleted.status()).toBe(404);
		expect(await prisma.projectReport.count({ where: { id: postId } })).toBe(1);
	});

	test("the author deletes a teammate's post", async ({ browser }) => {
		const page = await signInAs(browser, teammate);
		await page.request.post("/api/user/project/report", {
			data: { content: "A post the founder takes down.", projectId: project.id },
		});
		const theirs = await prisma.projectReport.findFirstOrThrow({
			where: { projectId: project.id, authorId: teammate.id },
			select: { id: true },
		});

		const answer = await authorPage.request.delete(
			`/api/user/project/report?id=${theirs.id}`,
		);
		expect(answer.ok()).toBe(true);
	});
});
