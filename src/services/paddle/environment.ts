/**
 * Live Paddle or its sandbox. Follows the build unless NEXT_PUBLIC_PADDLE_ENV
 * says otherwise: the e2e stand is a production build that pays in the sandbox.
 */
export const paddleLive = () =>
	process.env.NEXT_PUBLIC_PADDLE_ENV
		? process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
		: process.env.NODE_ENV === "production";
