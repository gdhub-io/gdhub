import { z } from "zod";
import { apiError, json, withValidation } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";
import { feedVisibleProjectFilter } from "@/services/prisma/queries";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const DevlogsQuerySchema = z.object({
	projectId: z.string().optional(),
	after: z.string().optional(),
	limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

type DevlogsQuery = z.infer<typeof DevlogsQuerySchema>;

const feedInclude = {
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
} as const;

export const GET = withValidation(
	DevlogsQuerySchema,
	"query",
)(async (_req, _ctx, { body }) => {
	const { projectId, after, limit } = body as DevlogsQuery;

	try {
		// Keyset pagination: cost stays flat however deep the feed is scrolled.
		const page = await prisma.projectReport.getFeedPage({
			// The global feed hides projects below Ideation so empty ones do not
			// flood it; a project's own devlog shows everything it has, including
			// the generated registration post.
			where: projectId ? { projectId } : { project: feedVisibleProjectFilter },
			includeSystem: Boolean(projectId),
			include: feedInclude,
			take: limit,
			after: after ?? null,
		});

		const applauseCounts = await prisma.projectReport.getApplauseCounts({
			projectReportIds: page.items.map((report) => report.id),
		});

		return json({
			items: page.items.map((report) => ({
				...report,
				applauseCount: applauseCounts.get(report.id) ?? 0,
			})),
			nextCursor: page.nextCursor,
			hasMore: page.hasMore,
		});
	} catch (error) {
		console.error("Error fetching project reports:", error);
		return apiError.internal();
	}
});
