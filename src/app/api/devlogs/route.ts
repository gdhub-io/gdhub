import { z } from "zod";
import { apiError, json, withValidation } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

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
			where: projectId
				? {
						projectId,
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

		return json(reportsWithApplause);
	} catch (error) {
		console.error("Error fetching project reports:", error);
		return apiError.internal();
	}
});
