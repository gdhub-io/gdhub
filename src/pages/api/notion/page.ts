import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import type { AvailableLocales } from "@/config/locale";
import { getBlocks, getGamelabStageBlocks } from "@/services/notion";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	const {
		pageSlug,
		locale = process.env.NEXT_PUBLIC_APP_DEFAULT_LOCALE as AvailableLocales,
		table = "docs",
	} = req.body;
	const session = await getServerSession(req, res, authOptions);
	let response: any;

	try {
		if (req.method !== "POST" || !session) throw new Error("Forbidden request");

		if (table == "docs") {
			response = await getBlocks(pageSlug, locale);
		}

		if (table == "gamelab-pipeline") {
			response = await getGamelabStageBlocks(pageSlug, locale);
		}

		if (!response) {
			throw new Error("Error");
		}

		response = response.map((block: any) => {
			if (block.type == "video") {
				console.log(block.video.external);
			}

			return block;
		});

		res.json(response);
	} catch (error: any) {
		res.json({ success: false, error });
	}
}
