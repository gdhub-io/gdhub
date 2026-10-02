import { z } from "zod";
import { apiError, json, withAuth, withValidation } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const ReportsQuerySchema = z.object({
	slug: z.string().optional(),
	projectId: z.string().optional(),
});

type ReportsQuery = z.infer<typeof ReportsQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		ReportsQuerySchema,
		"query",
	)(async (_req, _ctx, { body }) => {
		const { slug, projectId } = body as ReportsQuery;

		if (!projectId && !slug) {
			return apiError.forbidden("Either projectId or slug is required");
		}

		const reports = await prisma.projectReport.findMany({
			where: { OR: [{ project: { slug } }, { projectId }] },
			include: { project: true },
			orderBy: [{ publishedAt: "desc" }],
		});

		const applauseCounts = await prisma.projectReport.getApplauseCounts({
			projectReportIds: reports.map((report) => report.id),
		});

		return json(
			reports.map((report) => ({
				...report,
				applauseCount: applauseCounts.get(report.id) ?? 0,
			})),
		);
	}),
);
