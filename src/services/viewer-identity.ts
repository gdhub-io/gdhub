import { createHmac, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { cacheClaim } from "@/services/cache";

/**
 * Who is looking, for deduplication only.
 *
 * A view counter has to answer "is this the same viewer again today" without
 * being able to answer "who is this". Both are satisfied by hashing the viewer's
 * identity under a salt that is random, lives only in Redis and expires with the
 * day: within a day the same viewer yields the same key, and once the salt is
 * gone the key cannot be tied to anyone, by us included.
 */

/** Two days, so a key minted just before midnight stays resolvable. */
const SALT_TTL_SECONDS = 48 * 60 * 60;

/** The UTC day a view belongs to, as `YYYY-MM-DD` — the deduplication window. */
const utcDay = () => new Date().toISOString().slice(0, 10);

/**
 * The salt cannot change within its day, so the first request of a process pays
 * for it and the rest read memory. Without this every counted view would spend
 * two Redis round trips — a `SET NX` that fails plus a `GET` — on a value that is
 * already fixed.
 */
let memoised: { day: string; salt: string } | undefined;

const dailySalt = async (day: string) => {
	if (memoised?.day === day) return memoised.salt;

	const salt = await cacheClaim(
		`content-views:salt:${day}`,
		randomBytes(32).toString("hex"),
		SALT_TTL_SECONDS,
	);

	if (salt) memoised = { day, salt };

	return salt;
};

/**
 * Behind a proxy the socket address is the proxy's, so the forwarded headers are
 * the only signal. Empty when neither is set — locally, that collapses every
 * visitor into one, which undercounts rather than inflates.
 */
const clientIp = (req: NextRequest) =>
	req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
	req.headers.get("x-real-ip")?.trim() ||
	"";

/**
 * The day's opaque key for this viewer, or `undefined` when Redis is down and
 * no salt can be had — counting a view is worth less than counting it twice.
 */
export async function resolveViewerKey(
	req: NextRequest,
	userId?: string,
): Promise<{ viewerKey: string; viewedOn: Date } | undefined> {
	const day = utcDay();
	const salt = await dailySalt(day);
	if (!salt) return undefined;

	// Signed-in viewers key off the account, so the same person on a phone and a
	// laptop is one viewer; everyone else keys off the connection.
	const identity = userId
		? `u:${userId}`
		: `a:${clientIp(req)}|${req.headers.get("user-agent") ?? ""}`;

	const viewerKey = createHmac("sha256", salt)
		.update(identity)
		.digest("base64url");

	return { viewerKey, viewedOn: new Date(`${day}T00:00:00.000Z`) };
}
