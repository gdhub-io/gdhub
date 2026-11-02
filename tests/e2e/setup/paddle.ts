import type { FrameLocator, Page } from "@playwright/test";

/** Paddle's sandbox overlay, opened over the page. */
export const paddleOverlay = (page: Page) =>
	page.frameLocator("iframe[name=paddle_frame]");

/** Past the overlay's details step, on its card form. */
export async function paddleDetails(paddle: FrameLocator) {
	await paddle.getByRole("textbox", { name: "ZIP/Postcode" }).fill("1011AB");
	await paddle.getByRole("button", { name: "Continue" }).click();
	await paddle.getByRole("textbox", { name: "Card number" }).waitFor();
}

/** Pays with Paddle's test card. */
export async function payByCard(paddle: FrameLocator) {
	await paddle.getByRole("textbox", { name: "Card number" }).fill("4242424242424242");
	await paddle.getByRole("textbox", { name: "Card holder" }).fill("E2E Author");
	await paddle.getByRole("textbox", { name: "Expiry" }).fill("12/30");
	await paddle.getByRole("textbox", { name: "CVV" }).fill("100");
	await paddle.getByRole("button", { name: /^Pay / }).click();
}
