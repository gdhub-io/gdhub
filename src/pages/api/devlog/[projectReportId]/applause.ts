import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/auth";
import { prisma } from "@/services/prisma";

const getApplauseState = async (projectReportId: string, userId?: string) => {
	const [activity, count] = await Promise.all([
		prisma.applauseActivity.findUnique({
			where: {
				type_subjectId: {
					type: prismaClient.ApplauseActivityType.ProjectReport,
					subjectId: projectReportId,
				},
			},
			select: {
				id: true,
			},
		}),
		prisma.projectReport.getApplauseCount({
			projectReportId,
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
	const { projectReportId } = req.query;

	if (!projectReportId || typeof projectReportId !== "string") {
		return res.status(400).json({ message: "Project report ID is required" });
	}

	const session = await auth(req, res);
	const userId = session?.user?.id;

	if (req.method === "GET") {
		const state = await getApplauseState(projectReportId, userId);
		return res.status(200).json(state);
	}

	if (!userId) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	try {
		const report = await prisma.projectReport.findUnique({
			where: { id: projectReportId },
			select: { id: true, projectId: true },
		});

		if (!report) {
			return res.status(404).json({ message: "Project report not found" });
		}

		const activity = await prisma.applauseActivity.upsert({
			where: {
				type_subjectId: {
					type: prismaClient.ApplauseActivityType.ProjectReport,
					subjectId: projectReportId,
				},
			},
			update: {},
			create: {
				type: prismaClient.ApplauseActivityType.ProjectReport,
				subjectId: projectReportId,
				projectId: report.projectId,
				projectReportId: report.id,
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

			const state = await getApplauseState(projectReportId, userId);
			return res.status(200).json(state);
		}

		if (req.method === "DELETE") {
			await prisma.applause.deleteMany({
				where: {
					userId,
					activityId: activity.id,
				},
			});

			const state = await getApplauseState(projectReportId, userId);
			return res.status(200).json(state);
		}

		return res.status(405).json({ message: "Method not allowed" });
	} catch (error) {
		console.error("Error handling applause:", error);
		return res.status(500).json({ message: "Internal server error" });
	}
}
