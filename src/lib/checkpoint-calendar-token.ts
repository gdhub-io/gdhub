import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/helpers/env";

/**
 * The calendar subscription link names one person and one checkpoint and
 * carries its own proof: calendar apps fetch it without signing in, and it
 * cannot be made up for anyone else.
 */
const sign = (userId: string, checkpointId: string) =>
	createHmac("sha256", env<string>("NEXTAUTH_SECRET"))
		.update(`calendar:${userId}:${checkpointId}`)
		.digest("base64url");

export const calendarToken = (userId: string, checkpointId: string) =>
	`${userId}.${checkpointId}.${sign(userId, checkpointId)}`;

/** Who and which checkpoint the token names, or null when the signature does not hold. */
export const calendarTokenOf = (token: string) => {
	const [userId, checkpointId, signature] = token.split(".");
	if (!userId || !checkpointId || !signature) return null;
	const expected = Buffer.from(sign(userId, checkpointId));
	const given = Buffer.from(signature);
	return given.length === expected.length && timingSafeEqual(given, expected)
		? { userId, checkpointId }
		: null;
};
