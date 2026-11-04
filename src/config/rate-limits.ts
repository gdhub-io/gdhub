export type RateWindow = { limit: number; seconds: number };

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Fixed-window request limits, counted in Redis by `@/lib/rate-limit`. */
export const RATE_LIMITS = {
	/** Per user, for endpoints that spend a model call on every request. */
	ai: [
		{ limit: 10, seconds: MINUTE },
		{ limit: 60, seconds: HOUR },
	],
	/** Magic-link emails asked for from one IP. */
	magicLinkPerIp: [
		{ limit: 5, seconds: 10 * MINUTE },
		{ limit: 30, seconds: DAY },
	],
	/** Magic-link emails sent to one address, whoever asks. */
	magicLinkPerEmail: [
		{ limit: 3, seconds: 10 * MINUTE },
		{ limit: 10, seconds: DAY },
	],
	/** Team invitation emails one user may send. */
	teamInvite: [
		{ limit: 20, seconds: HOUR },
		{ limit: 50, seconds: DAY },
	],
} satisfies Record<string, RateWindow[]>;
