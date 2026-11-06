import type { NextRequest } from "next/server";
import { RATE_LIMITS } from "@/config/rate-limits";
import { env } from "@/helpers/env";
import { clientIp } from "@/helpers/request";
import { apiError } from "@/lib/api-handlers";
import { emailMediaThumbnailPath } from "@/lib/chat/email-media";
import { limitRequests } from "@/lib/rate-limit";

const DAY = 24 * 60 * 60;

/** Public on purpose: the reader is a mail client. See emailMediaThumbnailPath. */
export async function GET(
	req: NextRequest,
	ctx: { params: Promise<{ server: string; mediaId: string }> },
) {
	const limited = await limitRequests(
		"email-media-ip",
		clientIp(req) || "unknown",
		RATE_LIMITS.emailMediaPerIp,
	);
	if (limited) return limited;

	const { server, mediaId } = await ctx.params;
	const path = emailMediaThumbnailPath(
		server,
		mediaId,
		req.nextUrl.searchParams,
		env("MATRIX_CHAT_HOMESERVER_DOMAIN"),
	);
	if (!path) return apiError.notFound();

	const upstream = await fetch(`${env("MATRIX_CHAT_BASE_URL")}${path}`, {
		headers: {
			Authorization: `Bearer ${env("MATRIX_CHAT_SYNAPSE_ADMIN_TOKEN")}`,
		},
	}).catch(() => null);

	const type = upstream?.headers.get("content-type") ?? "";
	if (!upstream?.ok || !type.startsWith("image/")) return apiError.notFound();

	return new Response(upstream.body, {
		headers: {
			"Content-Type": type,
			// A media id never changes what it points at.
			"Cache-Control": `public, max-age=${30 * DAY}, immutable`,
			"X-Content-Type-Options": "nosniff",
		},
	});
}
