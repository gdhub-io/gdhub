import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/services/prisma";

const getAuthenticatedUserId = async (
	req: NextApiRequest,
	res: NextApiResponse,
) => {
	const session = await getServerSession(req, res, authOptions);

	return session?.user?.id;
};

const getStringParam = (value: string | string[] | undefined) =>
	Array.isArray(value) ? value[0] : value;

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	const requestedById = await getAuthenticatedUserId(req, res);

	if (!requestedById) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	try {
		if (req.method === "GET") {
			const action = getStringParam(req.query.action);
			const userId = getStringParam(req.query.userId) ?? requestedById;
			const params = { userId, requestedById };

			if (action === "prepare-delete") {
				const preview = await prisma.user.prepareToDeletePersonalData(params);
				return res.status(200).json(preview);
			}

			if (action === "export") {
				const exportData = await prisma.user.exportPersonalData(params);
				return res.status(200).json(exportData);
			}

			return res
				.status(400)
				.json({ message: "Unsupported user privacy action" });
		}

		if (req.method === "POST") {
			const { action, userId = requestedById, reason } = req.body ?? {};

			if (action === "delete-personal-data") {
				const user = await prisma.user.deletePersonalData({
					userId,
					requestedById,
					reason,
				});
				return res.status(200).json(user);
			}

			return res
				.status(400)
				.json({ message: "Unsupported user privacy action" });
		}

		res.setHeader("Allow", ["GET", "POST"]);
		return res.status(405).json({ message: "Method not allowed" });
	} catch (error) {
		console.error("[user/privacy] error", error);
		return res.status(500).json({
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
}
