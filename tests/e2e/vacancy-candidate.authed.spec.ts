import { VacancyApplicationStatus } from "@gdhub-io/gdhub-prisma";
import { type Browser, expect, type Page, test } from "@playwright/test";
import { prisma } from "../../src/services/prisma";
import { GAME } from "./checkpoints/support/game";
import { createProjectInHub } from "./setup/project";
import {
	grantUser,
	removeRun,
	type StandUser,
	signInAs,
} from "./setup/users";
import { addVacancy } from "./setup/vacancies";

/**
 * GDHUB-128, a vacancy between its author and the people who answer it: found
 * in the public list, applied for, then rejected or taken into the team.
 */

const VACANCY = "Narrative designer";

/** The candidate finds the vacancy in the public list, opens it and applies. */
async function apply(page: Page, greeting: string) {
	await page.goto("/jobs");
	await page
		.locator("div")
		.filter({ has: page.getByRole("heading", { name: VACANCY }) })
		.filter({ has: page.getByRole("link", { name: "Details" }) })
		.last()
		.getByRole("link", { name: "Details" })
		.click();
	await page.waitForURL(/\/job\//);

	await page.getByRole("button", { name: "Apply" }).click();
	const modal = page.getByRole("dialog");
	// The member persona's speciality (tests/personas.ts).
	await modal.getByText("Software Engineer").click();
	await modal.getByPlaceholder(/I'd love to join your project/).fill(greeting);
	await modal.getByRole("button", { name: "Choose" }).click();

	await expect(page.getByText("Your response is sent")).toBeVisible();
	await expect(page.getByRole("button", { name: "Withdraw application" })).toBeVisible();
}

test.describe.serial("a vacancy, between its author and its candidates", () => {
	let author: StandUser;
	let rejected: StandUser;
	let hired: StandUser;
	let slug: string;
	let authorPage: Page;

	const statusOf = async (user: StandUser) =>
		(
			await prisma.vacancyApplication.findFirst({
				where: { userId: user.id, vacancy: { team: { project: { slug } } } },
				orderBy: { createdAt: "desc" },
				select: { status: true },
			})
		)?.status;

	const candidateCard = async (user: StandUser) => {
		await authorPage.goto(`/user/project/${slug}/open-positions`);
		await authorPage.getByRole("button", { name: user.name }).click();
		// Frame 04.07: the talent card in its candidate form, named by its eyebrow.
		const card = authorPage.getByRole("dialog").filter({ hasText: "Candidate card" });
		await expect(card).toBeVisible();
		return card;
	};

	test.beforeAll(async ({ browser }) => {
		author = await grantUser("vacancy-owner");
		rejected = await grantUser("candidate-a", "member", "Mira Candidate");
		hired = await grantUser("candidate-b", "member", "Theo Candidate");

		authorPage = await signInAs(browser, author);
		// A fixed name: the AI check of a new project then replays from a recording.
		slug = await createProjectInHub(
			authorPage,
			GAME.name,
			GAME.description,
		);
		await addVacancy(authorPage, slug, VACANCY);
	});
	test.afterAll(removeRun);

	const applyAs = async (browser: Browser, user: StandUser, greeting: string) => {
		await apply(await signInAs(browser, user), greeting);
		await expect.poll(() => statusOf(user)).toBe(VacancyApplicationStatus.Submitted);
	};

	test("two candidates find the vacancy and apply", async ({ browser }) => {
		await applyAs(browser, rejected, "I wrote branching dialogue for two shipped games.");
		await applyAs(browser, hired, "I love harbour towns and systemic storytelling.");
	});

	test("the author sees them and rejects one", async () => {
		const card = await candidateCard(rejected);
		// The chat needs a Matrix server the stand does not have: only the way in is checked.
		await expect(card.getByRole("button", { name: "Message" })).toBeEnabled();
		await card.getByRole("button", { name: "Reject" }).click();

		await expect.poll(() => statusOf(rejected)).toBe(VacancyApplicationStatus.Rejected);
	});

	test("the author takes the other into the team", async () => {
		const card = await candidateCard(hired);
		await card.getByRole("button", { name: "Accept the team" }).click();
		await expect.poll(() => statusOf(hired)).toBe(VacancyApplicationStatus.Hired);

		await authorPage.goto(`/user/project/${slug}/team`);
		await expect(authorPage.getByText(hired.name)).toBeVisible({ timeout: 15_000 });
		await expect(authorPage.getByText(rejected.name)).toHaveCount(0);
	});
});
