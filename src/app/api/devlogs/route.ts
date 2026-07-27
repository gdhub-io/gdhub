import { z } from "zod";
import { nonSystemDevlogFilter } from "@/config/devlog";
import { apiError, json, withValidation } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";
import { feedVisibleProjectFilter } from "@/services/prisma/queries";

const DevlogsQuerySchema = z.object({
	projectId: z.string().optional(),
});

type DevlogsQuery = z.infer<typeof DevlogsQuerySchema>;

export const GET = withValidation(
	DevlogsQuerySchema,
	"query",
)(async (_req, _ctx, { body }) => {
	const { projectId } = body as DevlogsQuery;

	try {
		const reports = await prisma.projectReport.findMany({
			// Global feed skips generated posts and projects below Ideation, so empty
			// projects do not flood it.
			where: projectId
				? {
						projectId,
					}
				: {
						project: feedVisibleProjectFilter,
						...nonSystemDevlogFilter,
					},
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

		return json(reportsWithApplause);
	} catch (error) {
		console.error("Error fetching project reports:", error);
		return apiError.internal();
	}
});
