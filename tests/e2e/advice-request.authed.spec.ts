import { AdviceRequestStatus } from "@gdhub-io/gdhub-prisma";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { prisma } from "../../src/services/prisma";
import { makeProject, runCron } from "./checkpoints/support/stand";
import { pick } from "./setup/forms";
import {
	grantUser,
	removeRun,
	type StandUser,
	signInAs,
} from "./setup/users";

/**
 * GDHUB-135, a free one-off question to an expert: asked from the hub's experts
 * list, declined or answered by the advisor, withdrawn by the one who asked,
 * closed by the cron when nobody answers. Accepting opens a Matrix chat the
 * stand does not have, so an answered request is put in progress directly.
 */

test.describe.serial("an advice request, between a member and an advisor", () => {
	let advisor: StandUser;
	let asker: StandUser;
	let askerPage: Page;
	let advisorPage: Page;
	let projectId: string;

	const requestOf = (comment: string) =>
		prisma.adviceRequest.findFirstOrThrow({
			where: { fromUserId: asker.id, comment },
			select: { id: true, status: true },
		});

	/** The asker opens the advisor's card in the hub and sends a question. */
	const ask = async (comment: string) => {
		await askerPage.goto("/hub/experts");
		await askerPage
			.locator("div")
			.filter({ hasText: advisor.name })
			.filter({ has: askerPage.getByRole("button", { name: "Details" }) })
			// The innermost match is the advisor's own card.
			.last()
			.getByRole("button", { name: "Details" })
			.click();
		const modal = askerPage.getByRole("dialog");
		await pick(askerPage, "Topic");
		await pick(askerPage, "Your project");
		await modal.getByLabel("Comment").fill(comment);
		await modal.getByRole("button", { name: "Send request" }).click();
		await expect(askerPage.getByText("Your request is sent")).toBeVisible();

		return requestOf(comment);
	};

	/**
	 * The advisor's card for the asker's request under a filter. A card shows the
	 * topic and who asked, not the comment; each filter holds one of ours at a time.
	 */
	const card = async (filter: string): Promise<Locator> => {
		await advisorPage.goto("/advisor/requests");
		// The filter's label carries its count: "New 1".
		await advisorPage.getByText(new RegExp(`^${filter} \\d+$`)).click();
		// The advisor persona seeds requests of its own: ours is by the asker.
		return advisorPage.getByRole("article").filter({ hasText: asker.name });
	};

	test.beforeAll(async ({ browser }) => {
		advisor = await grantUser("advice-expert", "advisor", "Rina Expert");
		asker = await grantUser("advice-asker");
		askerPage = await signInAs(browser, asker);
		advisorPage = await signInAs(browser, advisor);
		// A new advisor accepts the Advisor Agreement on the way in.
		await advisorPage.goto("/advisor/requests");
		const terms = advisorPage
			.getByRole("dialog")
			.filter({ hasText: "Please accept our terms" });
		await terms.getByRole("checkbox", { name: /I accept the Advisor Agreement/ }).check();
		await terms.getByRole("button", { name: "Accept and continue" }).click();
		await expect(terms).toBeHidden();
		({ id: projectId } = await makeProject(askerPage, "Moss Lantern"));
	});
	test.afterAll(removeRun);

	test("the advisor declines a question", async () => {
		const comment = "How long should a vertical slice take?";
		await ask(comment);
		expect((await requestOf(comment)).status).toBe(AdviceRequestStatus.Created);

		await (await card("New")).getByRole("button", { name: "Decline" }).click();
		await expect
			.poll(async () => (await requestOf(comment)).status)
			.toBe(AdviceRequestStatus.Rejected);
	});

	test("the advisor marks an answered question done", async () => {
		const comment = "Is our combat loop too shallow for a demo?";
		const { id } = await ask(comment);
		// Accepting opens a Matrix chat; the stand has none.
		await prisma.adviceRequest.update({
			where: { id },
			data: { status: AdviceRequestStatus.Approved },
		});

		await (await card("In progress"))
			.getByRole("button", { name: "Mark done" })
			.click();
		await expect
			.poll(async () => (await requestOf(comment)).status)
			.toBe(AdviceRequestStatus.Executed);
	});

	test("the asker withdraws a question", async () => {
		const comment = "Should we cut the second biome?";
		await ask(comment);

		// The asker's own requests, each showing its comment.
		await askerPage.goto("/user/advice-requests");
		await askerPage
			.locator("div")
			.filter({ hasText: comment })
			.filter({ has: askerPage.getByRole("button", { name: "View" }) })
			.last()
			.getByRole("button", { name: "View" })
			.click();
		// Tolgee renders the key as "Cancel request".
		await askerPage.getByRole("button", { name: "Cancel request" }).click();
		await expect
			.poll(async () => (await requestOf(comment)).status)
			.toBe(AdviceRequestStatus.Closed);
	});

	test("nobody else withdraws it, and nobody asks for someone else's project", async ({
		browser,
	}) => {
		const comment = "What price for an early-access launch?";
		const { id } = await ask(comment);
		const stranger = await signInAs(browser, await grantUser("advice-stranger"));

		const withdrawn = await stranger.request.put(
			`/api/user/advice-request/${id}/cancel`,
		);
		expect(withdrawn.status()).toBe(404);
		expect((await requestOf(comment)).status).toBe(AdviceRequestStatus.Created);

		const asked = await stranger.request.post("/api/user/advice-request", {
			data: { topic: "Pricing", projectId, toUserId: advisor.id },
		});
		expect(asked.status()).toBe(404);
	});

	test("a question nobody answers for a month is closed", async () => {
		const comment = "What price for an early-access launch?";
		const { id } = await requestOf(comment);
		await prisma.adviceRequest.update({
			where: { id },
			data: { createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) },
		});

		await runCron(askerPage, "/api/cron/advice-request-reminder");
		await expect
			.poll(async () => (await requestOf(comment)).status)
			.toBe(AdviceRequestStatus.Closed);
	});
});
