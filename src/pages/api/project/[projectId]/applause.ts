import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/services/prisma";

const getApplauseState = async (projectId: string, userId?: string) => {
	const [activity, count] = await Promise.all([
		prisma.applauseActivity.findUnique({
			where: {
				type_subjectId: {
					type: prismaClient.ApplauseActivityType.Project,
					subjectId: projectId,
				},
			},
			select: {
				id: true,
			},
		}),
		prisma.project.getApplauseCount({
			projectId,
		}),
	]);

	const userApplause = userId
		? await prisma.applause.findFirst({
				where: {
					userId,
					activityId: activity?.id,
				},
				select: { id: true },
			})
		: null;

	return {
		count,
		hasApplauded: !!userApplause,
	};
};

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	const { projectId } = req.query;

	if (!projectId || typeof projectId !== "string") {
		return res.status(400).json({ message: "Project ID is required" });
	}

	const session = await getServerSession(req, res, authOptions);
	const userId = session?.user?.id;

	if (req.method === "GET") {
		const state = await getApplauseState(projectId, userId);
		return res.status(200).json(state);
	}

	if (!userId) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	try {
		const project = await prisma.project.findUnique({
			where: { id: projectId },
			select: { id: true },
		});

		if (!project) {
			return res.status(404).json({ message: "Project not found" });
		}

		const activity = await prisma.applauseActivity.upsert({
			where: {
				type_subjectId: {
					type: prismaClient.ApplauseActivityType.Project,
					subjectId: projectId,
				},
			},
			update: {},
			create: {
				type: prismaClient.ApplauseActivityType.Project,
				subjectId: projectId,
				projectId: project.id,
			},
			select: { id: true },
		});

		if (req.method === "POST") {
			await prisma.applause.upsert({
				where: {
					userId_activityId: {
						userId,
						activityId: activity.id,
					},
				},
				update: {},
				create: {
					userId,
					activityId: activity.id,
				},
			});

			const state = await getApplauseState(projectId, userId);
			return res.status(200).json(state);
		}

		if (req.method === "DELETE") {
			await prisma.applause.deleteMany({
				where: {
					userId,
					activityId: activity.id,
				},
			});

			const state = await getApplauseState(projectId, userId);
			return res.status(200).json(state);
		}

		return res.status(405).json({ message: "Method not allowed" });
	} catch (error) {
		console.error("Error handling project applause:", error);
		return res.status(500).json({ message: "Internal server error" });
	}
}
