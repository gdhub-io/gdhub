import { PaymentStatus, TeamVacancyStatus } from "@gdhub-io/gdhub-prisma";
import { expect, type Page, test } from "@playwright/test";
import { prisma } from "../../src/services/prisma";
import { paddleDetails, paddleOverlay, payByCard } from "./setup/paddle";
import { createProjectInHub } from "./setup/project";
import {
	grantUser,
	removeRun,
	type StandUser,
	signInAs,
	signInPage,
} from "./setup/users";
import { addVacancy, vacancyRow } from "./setup/vacancies";

/**
 * GDHUB-128, the author's side of a vacancy: free and priced, the listing fee
 * paid in Paddle's sandbox, archive and restore, expiry, and who may touch it.
 */

test.describe.serial("a vacancy, from its author's side", () => {
	let author: StandUser;
	let slug: string;

	const signedIn = async (page: Page) => {
		await signInPage(page, author);
		return page;
	};

	test.beforeAll(async ({ browser }) => {
		author = await grantUser("vacancy-author");
		const page = await signInAs(browser, author);
		// A fixed name: the AI check of a new project then replays from a recording.
		slug = await createProjectInHub(
			page,
			"Lantern Keepers",
			"A co-op lighthouse keeper game about guiding ships through storms.",
		);
	});
	test.afterAll(removeRun);

	test("a free vacancy is published at once and listed publicly", async ({
		page,
	}) => {
		await signedIn(page);
		await addVacancy(page, slug, "Level designer");

		const row = vacancyRow(page, "Level designer");
		await expect(row).toBeVisible({ timeout: 15_000 });
		await expect(row.getByText(/^draft$/i)).toHaveCount(0);
		await expect(row.getByText(/€/)).toHaveCount(0);
		await expect(row.getByRole("button", { name: /publish/i })).toHaveCount(0);

		await page.goto("/jobs");
		await expect(page.getByText("Level designer").first()).toBeVisible();
	});

	test("a priced vacancy waits as a draft for its fee, out of the public list", async ({
		page,
	}) => {
		await signedIn(page);
		const { id } = await addVacancy(page, slug, "Paid artist", 500);

		const row = vacancyRow(page, "Paid artist");
		await expect(row).toBeVisible({ timeout: 15_000 });
		await expect(row.getByText(/draft/i)).toBeVisible();
		await expect(row.getByText(/€500/)).toBeVisible();
		await expect(row.getByText(/pending/i)).toBeVisible();
		await expect(row.getByRole("button", { name: /pay & publish/i })).toBeVisible();

		// The fee cannot be skipped by asking the API to publish (GDHUB-136).
		const skipped = await page.request.put(`/api/user/project/vacancy?id=${id}`, {
			data: { status: TeamVacancyStatus.Published },
		});
		expect(skipped.status()).toBe(400);

		await page.goto("/jobs");
		await expect(page.getByText("Paid artist")).toHaveCount(0);
	});

	test("paying the fee in Paddle publishes the vacancy", async ({ page }) => {
		await signedIn(page);
		await page.goto(`/user/project/${slug}/open-positions`);
		await vacancyRow(page, "Paid artist")
			.getByRole("button", { name: /pay & publish/i })
			.click();

		const paddle = paddleOverlay(page);
		await paddleDetails(paddle);
		await payByCard(paddle);

		// Paddle sends the author back; no webhook reaches the stand, so it is the
		// page asking Paddle that publishes.
		await page.waitForURL(/feePaid=/, { timeout: 90_000 });
		await expect(page.getByText("Paid. The position is published.")).toBeVisible({
			timeout: 30_000,
		});
		const vacancy = await prisma.teamVacancy.findFirstOrThrow({
			where: { title: "Paid artist", team: { project: { slug } } },
			select: { id: true },
		});
		await expect
			.poll(
				async () =>
					(
						await prisma.payment.findFirst({
							where: { payableId: vacancy.id },
							select: { status: true },
						})
					)?.status,
				{ timeout: 60_000 },
			)
			.toBe(PaymentStatus.COMPLETED);
		expect(
			(await prisma.teamVacancy.findUniqueOrThrow({ where: { id: vacancy.id } }))
				.status,
		).toBe(TeamVacancyStatus.Published);

		await page.reload();
		const row = vacancyRow(page, "Paid artist");
		await expect(row.getByText(/^draft$/i)).toHaveCount(0);
		await expect(row.getByRole("button", { name: /pay & publish/i })).toHaveCount(0);
	});

	test("editing keeps the price; archiving and restoring make a new draft", async ({
		page,
	}) => {
		await signedIn(page);
		await addVacancy(page, slug, "Sound designer", 300);
		const row = vacancyRow(page, "Sound designer");
		await expect(row).toBeVisible({ timeout: 15_000 });

		await row.getByRole("button", { name: /^change$/i }).click();
		let modal = page.getByRole("dialog");
		await expect(modal.getByLabel(/amount \(eur\)/i)).toHaveValue("300");
		await modal.getByRole("button", { name: "Close" }).first().click();
		await expect(modal).toBeHidden();

		await row.getByRole("button", { name: /actions/i }).click();
		await page.getByRole("menuitem", { name: /archive/i }).click();
		await page.getByRole("dialog").getByRole("button", { name: /^yes$/i }).click();
		await expect(vacancyRow(page, "Sound designer")).toHaveCount(0, {
			timeout: 15_000,
		});

		await page.getByRole("button", { name: /^archive$/i }).click();
		modal = page.getByRole("dialog");
		await modal.getByText("Sound designer").click();
		await modal.getByRole("button", { name: /restore/i }).click();
		await page.getByRole("dialog").getByRole("button", { name: "Close" }).first().click();
		await expect(vacancyRow(page, "Sound designer")).toBeVisible({
			timeout: 15_000,
		});
	});

	test("an expired vacancy leaves the public list", async ({ page }) => {
		await prisma.teamVacancy.updateMany({
			where: { title: "Level designer", team: { project: { slug } } },
			data: { finishedAt: new Date(Date.now() - 60_000) },
		});

		await page.goto("/jobs");
		await expect(page.getByText("Level designer")).toHaveCount(0);
	});

	test("someone outside the project cannot change its vacancy", async ({
		browser,
	}) => {
		const stranger = await signInAs(browser, await grantUser("stranger"));
		const vacancy = await prisma.teamVacancy.findFirstOrThrow({
			where: { title: "Paid artist", team: { project: { slug } } },
			select: { id: true },
		});

		const answer = await stranger.request.put(
			`/api/user/project/vacancy?id=${vacancy.id}`,
			{ data: { title: "Hijacked" } },
		);

		expect(answer.status()).toBe(404);
	});
});
