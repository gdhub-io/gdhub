import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/helpers/env";

/**
 * A link that names what it opens and carries its own proof, so it works
 * without signing in and cannot be made up for anything else. `purpose` keeps
 * a pulse token from opening a calendar.
 */
const sign = (purpose: string, ids: string[]) =>
	createHmac("sha256", env<string>("NEXTAUTH_SECRET"))
		.update(`${purpose}:${ids.join(":")}`)
		.digest("base64url");

export const signedToken = (purpose: string, ...ids: string[]) =>
	[...ids, sign(purpose, ids)].join(".");

/** The ids the token names, or null when there are not `count` of them or the signature does not hold. */
export const idsOfSignedToken = (
	purpose: string,
	token: string,
	count: number,
) => {
	const parts = token.split(".");
	const signature = parts.pop();
	if (!signature || parts.length !== count || parts.some((part) => !part))
		return null;
	const expected = Buffer.from(sign(purpose, parts));
	const given = Buffer.from(signature);
	return given.length === expected.length && timingSafeEqual(given, expected)
		? parts
		: null;
};
