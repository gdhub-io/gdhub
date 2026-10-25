import { expect, test } from "@playwright/test";
import { prisma } from "../../../src/services/prisma";
import { RunLog } from "./support/run-log";
import {
	grantUser,
	IMAGE,
	makeProject,
	removeRun,
	signInAs,
	VIDEO,
} from "./support/stand";

/**
 * GDHUB-79 A3: a devlog post is written in the composer with a video, gets an
 * image, is edited, shows on its public page, and is deleted. The image is
 * added by URL: an upload would go to the real Sanity dataset.
 */

const log = new RunLog("A3 devlog");

test.afterAll(async () => {
	await log.write();
	await removeRun();
});

test("a devlog post is published, edited, shown and deleted", async ({
	browser,
}) => {
	const author = await grantUser("author-a3");
	const page = await signInAs(browser, author);
	const project = await makeProject(page, "Tidebound");

	await page.goto(`/user/project/${project.slug}/devlog`);
	await page.getByRole("button", { name: "Add post" }).click();
	const composer = page.getByRole("dialog");
	const editor = composer.locator(".codex-editor [contenteditable=true]").first();
	await editor.click();
	await page.keyboard.type("Week one: the tide loop works on one island.");

	await composer.getByRole("button", { name: "Video" }).click();
	await page.getByPlaceholder("Paste a video link").fill(VIDEO);
	await page.getByRole("button", { name: "Add", exact: true }).click();
	await expect(composer.locator("iframe")).toHaveCount(1);
	await composer.getByRole("button", { name: "Post" }).click();
	await expect(composer).toBeHidden();

	const post = await prisma.projectReport.findFirstOrThrow({
		where: { projectId: project.id, isSystem: false },
		select: { id: true, contentEditor: true },
	});
	const blocks = (post.contentEditor as { blocks: { type: string }[] }).blocks;
	expect(blocks.map((block) => block.type)).toEqual(
		expect.arrayContaining(["paragraph", "embed"]),
	);
	log.step(`Posted ${post.id} with text and a video`);

	const edited = await page.request.put("/api/user/project/report", {
		data: {
			id: post.id,
			content: "",
			contentEditor: {
				...(post.contentEditor as object),
				blocks: [
					...blocks,
					{ type: "image", data: { file: { url: IMAGE }, caption: "The tide out" } },
				],
			},
		},
	});
	expect(edited.ok(), await edited.text()).toBe(true);
	log.step("Edited: an image added");

	await page.goto(`/devlog/${post.id}`);
	await expect(page.getByText("Week one: the tide loop works on one island.")).toBeVisible();
	await expect(page.locator(`img[src*="Fronalpstock"]`).first()).toBeVisible();
	log.step("The public page shows the text and the image");

	await page.goto(`/user/project/${project.slug}/devlog`);
	await page.getByRole("button", { name: "Post actions" }).first().click();
	await page.getByRole("menuitem", { name: "Delete" }).click();
	await page.getByRole("button", { name: "Yes" }).click();
	await expect(page.getByText("Report deleted")).toBeVisible();
	await expect
		.poll(() => prisma.projectReport.count({ where: { id: post.id } }))
		.toBe(0);
	log.step("Deleted");
});
