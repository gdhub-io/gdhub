/**
 * The e2e stand, where recorded model answers and an emulated Daily stand in
 * for the real services: `bun run dev:test`, or the stand's own production
 * build (`bun run stand:build`). Never production and never a deployment: a
 * production build counts only when it was built with the stand flag, which a
 * real build never gets, and never on Vercel. The stand's own E2E_TEST_AUTH is
 * required as well.
 */
const standBuild = () =>
	process.env.NODE_ENV !== "production" ||
	(process.env.NEXT_PUBLIC_E2E_STAND === "1" && !process.env.VERCEL);

export const onTheStand = () =>
	standBuild() && process.env.E2E_TEST_AUTH === "1";

export const dailyEmulated = () =>
	onTheStand() && process.env.DAILY_EMULATED === "1";

/** The stand as the browser can tell it too: for config both sides read. */
export const E2E_STAND =
	standBuild() && process.env.NEXT_PUBLIC_E2E_STAND === "1";
