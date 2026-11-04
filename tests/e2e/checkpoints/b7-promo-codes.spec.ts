import { expect, type FrameLocator, type Page, test } from "@playwright/test";
import { prisma } from "../../../src/services/prisma";
import { GAME } from "./support/game";
import {
	activeCheckpoint,
	openPaddle,
	payWithCard,
	planCheckpoint,
} from "./support/purchase";
import { RunLog } from "./support/run-log";
import { grantUser, makeProject, removeRun, signInAs } from "./support/stand";

/**
 * GDHUB-79 B7: promotion codes are made by an admin as Paddle discounts and
 * typed into Paddle's overlay: an amount code lowers the price shown, a
 * switched-off one is refused, a percent code lowers what is charged. One
 * purchase for all three; the codes are switched off again afterwards, so the
 * sandbox keeps no live ones.
 */

const log = new RunLog("B7 promotion codes");
const SUFFIX = Date.now().toString(36).toUpperCase();
const made: string[] = [];
let admin: Page;

const makeCode = async (
	code: string,
	kind: "percent" | "amount",
	value: number,
) => {
	const response = await admin.request.post("/api/admin/checkpoints/promo-codes", {
		data: { code, kind, value, firstPurchaseOnly: false },
	});
	expect(response.ok(), await response.text()).toBe(true);
	const { id } = (await response.json()) as { id: string };
	made.push(id);
	return id;
};

const applyCode = async (paddle: FrameLocator, code: string) => {
	await paddle.getByRole("button", { name: "Add discount" }).click();
	await paddle.getByRole("textbox", { name: "Enter your coupon code" }).fill(code);
	await paddle.getByRole("button", { name: "Apply" }).click();
};

test.beforeAll(async ({ browser }) => {
	admin = await signInAs(browser, await grantUser("admin-b7", "superAdmin"));
});

test.afterAll(async () => {
	for (const id of made) {
		await admin.request.patch(`/api/admin/checkpoints/promo-codes/${id}`, {
			data: { active: false },
		});
	}
	await log.write();
	await removeRun();
});

test("codes lower the charge; a switched-off one is refused", async ({
	browser,
}) => {
	const amount = `E2EAMT${SUFFIX}`;
	const percent = `E2EPCT${SUFFIX}`;
	const off = `E2EOFF${SUFFIX}`;
	await makeCode(amount, "amount", 5);
	await makeCode(percent, "percent", 25);
	const offId = await makeCode(off, "percent", 50);
	await admin.request.patch(`/api/admin/checkpoints/promo-codes/${offId}`, {
		data: { active: false },
	});

	const page = await signInAs(browser, await grantUser("author-b7"));
	const project = await makeProject(page, GAME.name);
	await page.goto(`/checkpoint/new?project=${project.slug}`);
	await planCheckpoint(page, GAME.doneSoFar);

	// $5 off, seen in the overlay and left unpaid: the next Pay opens a new checkout.
	let paddle = await openPaddle(page);
	await applyCode(paddle, amount);
	await expect(paddle.getByText("$15.00").first()).toBeVisible();
	await paddle.getByRole("img", { name: "Close" }).click();
	log.step(`${amount} ($5 off): $15 in the overlay`);

	paddle = await openPaddle(page);
	await applyCode(paddle, off);
	await expect(
		paddle.getByText("You need to enter a valid discount code."),
	).toBeVisible();
	await expect(paddle.getByText("$20.00").first()).toBeVisible();
	log.step(`${off}, switched off: refused, the price stays $20`);

	await paddle.getByRole("textbox", { name: "Enter your coupon code" }).fill(percent);
	await paddle.getByRole("button", { name: "Apply" }).click();
	await expect(paddle.getByText("$15.00").first()).toBeVisible();
	await payWithCard(page, paddle);

	const checkpoint = await activeCheckpoint(project.id);
	log.track(checkpoint.id);
	const payment = await prisma.payment.findUniqueOrThrow({
		where: { id: checkpoint.paymentId ?? "" },
		select: { amount: true },
	});
	expect(payment.amount).toBe(1500);
	log.step(`${percent} (25% off): charged ${payment.amount}`);
});
