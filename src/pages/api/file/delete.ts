import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/auth";
import SanityService from "@/services/sanity";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
	try {
		const session = await auth(req, res);
		const { fileUrl } = req.body;

		if (req.method !== "POST" || !session) throw new Error("Forbidden request");

		const response = await SanityService.removeFile(fileUrl);

		res.status(200).json(response);
	} catch (error: any) {
		console.log("[API ERROR]", error);

		res.status(200).json({ success: false, error: error?.message });
	}
};

export default handler;
