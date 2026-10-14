import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/helpers/env";

/**
 * The pulse link names one person's pulse for one sprint and carries its own
 * proof, so it works without signing in and cannot be made up for anyone else.
 */
const sign = (pulseId: string) =>
	createHmac("sha256", env<string>("NEXTAUTH_SECRET"))
		.update(`pulse:${pulseId}`)
		.digest("base64url");

export const pulseToken = (pulseId: string) => `${pulseId}.${sign(pulseId)}`;

/** The pulse id the token names, or null when the signature does not hold. */
export const pulseIdOf = (token: string) => {
	const [pulseId, signature] = token.split(".");
	if (!pulseId || !signature) return null;
	const expected = Buffer.from(sign(pulseId));
	const given = Buffer.from(signature);
	return given.length === expected.length && timingSafeEqual(given, expected)
		? pulseId
		: null;
};
