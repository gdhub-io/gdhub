import { initializePaddle, type Paddle } from "@paddle/paddle-js";

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
		environment:
			process.env.NODE_ENV === "production" ? "production" : "sandbox",
	});

	if (!instance) {
		throw new Error("Failed to initialize Paddle");
	}

	paddleInstance = instance;
	return paddleInstance;
}

export async function openPaddleCheckout(options: {
	priceId: string;
	customData?: Record<string, any>;
	successUrl?: string;
	customMessage?: string;
}): Promise<void> {
	const paddle = await getPaddleInstance();

	if (!paddle) {
		throw new Error("Paddle instance not initialized");
	}

	paddle.Checkout.open({
		items: [
			{
				priceId: options.priceId,
				quantity: 1,
			},
		],
		customData: options.customData,
		settings: {
			displayMode: "overlay",
			theme: "light",
			successUrl: options.successUrl || "/",
		},
	});
}

export default { getPaddleInstance, openPaddleCheckout };
