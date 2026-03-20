import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/services/prisma";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	if (req.method !== "GET") {
		return res.status(405).json({ message: "Method not allowed" });
	}

	try {
		const { projectId } = req.query;

		const reports = await prisma.projectReport.findMany({
			where: projectId
				? {
						projectId: String(projectId),
					}
				: undefined,
			orderBy: {
				publishedAt: "desc",
			},
			include: {
				project: {
					select: {
						name: true,
						coverImage: true,
						slug: true,
					},
				},
				author: {
					select: {
						name: true,
						image: true,
					},
				},
			},
		});

		const reportsWithApplause = await Promise.all(
			reports.map(async (report) => ({
				...report,
				applauseCount: await prisma.projectReport.getApplauseCount({
					projectReportId: report.id,
				}),
			})),
		);

		return res.status(200).json(reportsWithApplause);
	} catch (error) {
		console.error("Error fetching project reports:", error);
		return res.status(500).json({ message: "Internal server error" });
	}
}
