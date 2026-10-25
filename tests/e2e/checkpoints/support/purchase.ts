import { CheckpointStatus } from "@gdhub-io/gdhub-prisma";
import { expect, type FrameLocator, type Page } from "@playwright/test";
import { prisma } from "../../../../src/services/prisma";

/**
 * The author's way from the checkpoint hub to a paid AI checkpoint: what is
 * done so far, the goal and the team's hours, the AI curator, the terms, and
 * Paddle's sandbox overlay with its test card.
 */

export const GOAL =
	"A playable vertical slice: two islands, the tide loop and co-op sailing, tested by five players";

/** From the hub (`/checkpoint/new?project=…`) to the payment step. */
export async function planCheckpoint(page: Page, doneSoFar: string) {
	if (!page.url().includes("/checkpoint/new/project")) {
		await page.getByRole("button", { name: "Fill in" }).click();
	}
	await page.getByRole("textbox", { name: "Done so far, line 1" }).fill(doneSoFar);
	await page.getByRole("button", { name: "Save and continue" }).click();

	await page.waitForURL(/step=goal/);
	await page.getByRole("spinbutton", { name: "Your hours a sprint, from" }).fill("10");
	await page.getByRole("spinbutton", { name: "Your hours a sprint, up to" }).fill("15");
	await page.getByPlaceholder("A playable greybox friends can try in 10 minutes…").fill(GOAL);
	await page.getByRole("button", { name: "Next — curator" }).click();
	// The AI reads the goal first; a remark asks to confirm once more.
	const anyway = page.getByRole("button", { name: "Continue anyway" });
	const curator = page.getByRole("button", { name: "Next — payment" });
	await expect(anyway.or(curator)).toBeVisible({ timeout: 60_000 });
	if (await anyway.isVisible()) await anyway.click();

	await page.waitForURL(/step=curator/);
	await expect(page.getByRole("radio").first()).toBeChecked();
	await page.getByRole("button", { name: "Next — payment" }).click();
	await page.waitForURL(/step=payment/);
}

/** Ticks the terms and presses Pay: Paddle's overlay opens on its details step. */
export async function openOverlay(page: Page) {
	await page.getByRole("checkbox", { name: /I am 18 or over/ }).check();
	await page.getByRole("checkbox", { name: /start before the 14-day/ }).check();
	await page.getByRole("button", { name: /^Pay / }).click();

	return page.frameLocator("iframe[name=paddle_frame]");
}

/** Paddle's overlay, past the details step, on the card form. */
export async function openPaddle(page: Page) {
	const paddle = await openOverlay(page);
	await paddle.getByRole("textbox", { name: "ZIP/Postcode" }).fill("1011AB");
	await paddle.getByRole("button", { name: "Continue" }).click();
	await paddle.getByRole("textbox", { name: "Card number" }).waitFor();

	return paddle;
}

/** Pays in Paddle's overlay with its test card and waits for the ready step. */
export async function payInPaddle(page: Page) {
	await payWithCard(page, await openPaddle(page));
}

export async function payWithCard(page: Page, paddle: FrameLocator) {
	await paddle.getByRole("textbox", { name: "Card number" }).fill("4242424242424242");
	await paddle.getByRole("textbox", { name: "Card holder" }).fill("E2E Author");
	await paddle.getByRole("textbox", { name: "Expiry" }).fill("12/30");
	await paddle.getByRole("textbox", { name: "CVV" }).fill("100");
	await paddle.getByRole("button", { name: /^Pay / }).click();

	await page.waitForURL(/step=ready/, { timeout: 90_000 });
}

/** The checkpoint the project is buying, once Paddle's webhook has started it. */
export async function activeCheckpoint(projectId: string) {
	await expect
		.poll(
			async () =>
				(
					await prisma.projectCheckpoint.findFirst({
						where: { projectId },
						orderBy: { createdAt: "desc" },
						select: { status: true },
					})
				)?.status,
			{ timeout: 90_000 },
		)
		.toBe(CheckpointStatus.Active);

	return prisma.projectCheckpoint.findFirstOrThrow({
		where: { projectId, status: CheckpointStatus.Active },
		select: {
			id: true,
			goal: true,
			paymentId: true,
			sessions: { select: { index: true } },
			legalAcceptances: { select: { code: true } },
		},
	});
}
