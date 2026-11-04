import type { NextRequest } from "next/server";
import { clientIp } from "@/helpers/request";
import { apiError } from "@/lib/api-handlers";
import type { LegalError, RequestMeta } from "./accept";

/** The response for a refused acceptance; anything else is rethrown by the caller. */
export function legalErrorResponse(error: LegalError) {
	const details = { reason: `legal.${error.reason}`, code: error.code };
	if (error.reason === "outdated") {
		return apiError.conflict("The document was updated", details);
	}
	if (error.reason === "unpublished") {
		return apiError.unavailable("The document is not published yet");
	}
	return apiError.badRequest("The document must be accepted", details);
}

export const requestMeta = (req: NextRequest): RequestMeta => ({
	ipAddress: clientIp(req) || null,
	userAgent: req.headers.get("user-agent"),
});
