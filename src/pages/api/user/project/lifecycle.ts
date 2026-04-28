import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/services/prisma";
import {
	getProjectLifecycleNotificationSnapshot,
	notifyProjectLifecycleRecipients,
} from "@/services/projectLifecycleNotifications";

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
	const authorId = await getAuthenticatedUserId(req, res);

	if (!authorId) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	try {
		if (req.method === "GET") {
			const projectId = getStringParam(req.query.id);

			if (!projectId) {
				return res.status(400).json({ message: "Project id is required" });
			}

			const preview = await prisma.project.prepareToDeleting({
				projectId,
				authorId,
			});

			return res.status(200).json(preview);
		}

		if (req.method === "POST") {
			const { id: projectId, action } = req.body ?? {};

			if (!projectId || typeof projectId !== "string") {
				return res.status(400).json({ message: "Project id is required" });
			}

			const params = { projectId, authorId };

			if (action === "delete") {
				const notificationSnapshot =
					await getProjectLifecycleNotificationSnapshot({
						db: prisma,
						projectId,
						authorId,
					});
				const project = await prisma.project.deleteProject(params);
				await notifyProjectLifecycleRecipients({
					action: "delete",
					snapshot: notificationSnapshot,
				});
				return res.status(200).json(project);
			}

			if (action === "archive") {
				const notificationSnapshot =
					await getProjectLifecycleNotificationSnapshot({
						db: prisma,
						projectId,
						authorId,
					});
				const project = await prisma.project.archiveProject(params);
				await notifyProjectLifecycleRecipients({
					action: "archive",
					snapshot: notificationSnapshot,
				});
				return res.status(200).json(project);
			}

			if (action === "restore") {
				const project = await prisma.project.restoreProject(params);
				return res.status(200).json(project);
			}

			return res
				.status(400)
				.json({ message: "Unsupported project lifecycle action" });
		}

		res.setHeader("Allow", ["GET", "POST"]);
		return res.status(405).json({ message: "Method not allowed" });
	} catch (error) {
		console.error("[user/project/lifecycle] error", error);
		return res.status(500).json({
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
}
