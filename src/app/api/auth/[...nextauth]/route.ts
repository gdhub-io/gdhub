import type { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { RATE_LIMITS } from "@/config/rate-limits";
import { clientIp } from "@/helpers/request";
import { rateLimit } from "@/lib/rate-limit";

export const { GET } = handlers;

/** Seconds to wait when this magic-link request is over a limit, else null. */
async function magicLinkWait(req: NextRequest) {
	if (!req.nextUrl.pathname.endsWith("/signin/email")) return null;

	const form = await req
		.clone()
		.formData()
		.catch(() => null);
	const email = String(form?.get("email") ?? "")
		.trim()
		.toLowerCase();

	const waits = await Promise.all([
		rateLimit(
			"magic-link-ip",
			clientIp(req) || "unknown",
			RATE_LIMITS.magicLinkPerIp,
		),
		email
			? rateLimit("magic-link-email", email, RATE_LIMITS.magicLinkPerEmail)
			: null,
	]);
	const exceeded = waits.filter((wait): wait is number => wait !== null);
	return exceeded.length ? Math.max(...exceeded) : null;
}

export async function POST(req: NextRequest) {
	const wait = await magicLinkWait(req);
	if (wait === null) return handlers.POST(req);

	// next-auth's `signIn()` reads `error` off the `url` it gets back.
	const url = new URL("/signin", req.nextUrl.origin);
	url.searchParams.set("error", "Too many sign-in emails. Try again later.");
	return Response.json(
		{ url: url.toString() },
		{ status: 429, headers: { "Retry-After": String(wait) } },
	);
}
