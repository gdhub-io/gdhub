import type { NextRequest } from "next/server";

/**
 * Behind a proxy the socket address is the proxy's, so the forwarded headers are
 * the only signal. Empty when neither is set — locally, that collapses every
 * visitor into one, which undercounts rather than inflates.
 */
export const clientIp = (req: NextRequest) =>
	req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
	req.headers.get("x-real-ip")?.trim() ||
	"";
