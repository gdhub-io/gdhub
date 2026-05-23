import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import type { AvailableLocales } from "@/config/locale";
import { apiError, json } from "@/lib/api-handlers";
import { getBlocks, getGamelabStageBlocks } from "@/services/notion";

export async function POST(req: NextRequest) {
	const session = await auth();
	if (!session) return apiError.forbidden("Forbidden request");

	const body = (await req.json().catch(() => null)) as {
		pageSlug?: string;
		locale?: AvailableLocales;
		table?: string;
	} | null;
	if (!body) return apiError.badRequest("Invalid JSON body");

	const {
		pageSlug,
		locale = process.env.NEXT_PUBLIC_APP_DEFAULT_LOCALE as AvailableLocales,
		table = "docs",
	} = body;

	if (!pageSlug) return apiError.badRequest("pageSlug is required");

	let response: unknown;

	try {
		if (table === "docs") {
			response = await getBlocks(pageSlug, locale);
		}

		if (table === "gamelab-pipeline") {
			response = await getGamelabStageBlocks(pageSlug, locale);
		}

		if (!response) {
			throw new Error("Error");
		}

		const mapped = (response as Array<Record<string, any>>).map((block) => {
			if (block.type === "video") {
				console.log(block.video?.external);
			}
			return block;
		});

		return json(mapped);
	} catch (error: any) {
		return json({ success: false, error });
	}
}
