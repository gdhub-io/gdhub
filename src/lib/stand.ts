/**
 * The e2e stand (`bun run dev:test`), where recorded model answers and an
 * emulated Daily stand in for the real services. Never production, and never
 * the app the team uses: the stand's own E2E_TEST_AUTH is required.
 */
export const onTheStand = () =>
	process.env.NODE_ENV !== "production" && process.env.E2E_TEST_AUTH === "1";

export const dailyEmulated = () =>
	onTheStand() && process.env.DAILY_EMULATED === "1";
