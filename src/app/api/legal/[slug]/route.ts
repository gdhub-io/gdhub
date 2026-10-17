import type { NextRequest } from "next/server";
import { apiError, json } from "@/lib/api-handlers";
import { loadLegalPage } from "@/lib/legal/pages";

/** The version in effect, for a modal that shows the text before the tick. */
export async function GET(
	_req: NextRequest,
	ctx: { params: Promise<{ slug: string }> },
) {
	const page = loadLegalPage((await ctx.params).slug);
	if (!page) return apiError.notFound("Document not found");
	const { title, version, effectiveAt, text } = page;
	return json({ title, version, effectiveAt, text });
}
