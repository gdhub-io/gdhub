import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { paddleLive } from "./environment";

let paddleInstance: Paddle | null = null;

export async function getPaddleInstance(): Promise<Paddle> {
	if (paddleInstance) {
		return paddleInstance;
	}

	const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

	if (!clientToken) {
		throw new Error(
			"NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is not set in environment variables",
		);
	}

	const instance = await initializePaddle({
		token: clientToken,
		environment: paddleLive() ? "production" : "sandbox",
	});

	if (!instance) {
		throw new Error("Failed to initialize Paddle");
	}

	paddleInstance = instance;
	return paddleInstance;
}

/**
 * Opens the overlay for a transaction the server already made, so the price and
 * the `Payment` row it settles are fixed there rather than in the browser.
 */
export async function openPaddleTransaction(options: {
	transactionId: string;
	successUrl: string;
	customerEmail?: string;
}): Promise<void> {
	const paddle = await getPaddleInstance();

	paddle.Checkout.open({
		transactionId: options.transactionId,
		customer: options.customerEmail
			? { email: options.customerEmail }
			: undefined,
		settings: {
			displayMode: "overlay",
			theme: "light",
			successUrl: options.successUrl,
		},
	});
}

export default { getPaddleInstance, openPaddleTransaction };
