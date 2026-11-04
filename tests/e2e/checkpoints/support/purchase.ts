import { CheckpointStatus } from "@gdhub-io/gdhub-prisma";
import { expect, type FrameLocator, type Page } from "@playwright/test";
import { prisma } from "../../../../src/services/prisma";
import { paddleDetails, paddleOverlay, payByCard } from "../../setup/paddle";
import { GAME } from "./game";

/**
 * The author's way from the checkpoint hub to a paid AI checkpoint: what is
 * done so far, the goal and the team's hours, the AI curator, the terms, and
 * Paddle's sandbox overlay with its test card.
 */

export const GOAL = GAME.goal;

/**
 * From the hub (`/checkpoint/new?project=…`) to the payment step: with the AI
 * curator, or with the expert named, on the first free hour they offer.
 */
export async function planCheckpoint(
	page: Page,
	doneSoFar: string,
	expert?: string,
) {
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
	if (expert) {
		await page.getByRole("button", { name: /Industry expert/ }).click();
		await page.getByRole("row", { name: new RegExp(expert) }).first().click();
		await page.getByRole("button", { name: /^\d\d:\d\d$/ }).first().click();
	} else {
		await expect(page.getByRole("radio").first()).toBeChecked();
	}
	await page.getByRole("button", { name: "Next — payment" }).click();
	await page.waitForURL(/step=payment/);
}

/** Ticks the terms and presses Pay: Paddle's overlay opens on its details step. */
export async function openOverlay(page: Page) {
	await page.getByRole("checkbox", { name: /I am 18 or over/ }).check();
	await page.getByRole("checkbox", { name: /start before the 14-day/ }).check();
	await page.getByRole("button", { name: /^Pay / }).click();

	return paddleOverlay(page);
}

/** Paddle's overlay, past the details step, on the card form. */
export async function openPaddle(page: Page) {
	const paddle = await openOverlay(page);
	await paddleDetails(paddle);

	return paddle;
}

/** Pays in Paddle's overlay with its test card and waits for the ready step. */
export async function payInPaddle(page: Page) {
	await payWithCard(page, await openPaddle(page));
}

export async function payWithCard(page: Page, paddle: FrameLocator) {
	await payByCard(paddle);

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
