import { prisma } from "@/services/prisma";
import { feedVisibleProjectFilter } from "@/services/prisma/queries";
import type { DevlogFeedPage } from "@/types/devlog";

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

interface DevlogFeedArgs {
	projectId?: string | null;
	after?: string | null;
	limit: number;
}

export async function getDevlogFeedPage({
	projectId,
	after,
	limit,
}: DevlogFeedArgs): Promise<DevlogFeedPage<Record<string, unknown>>> {
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

	return {
		items: page.items.map((report) => ({
			...report,
			applauseCount: applauseCounts.get(report.id) ?? 0,
		})),
		// The cursor used to survive the last full page, so the client spent a
		// round trip discovering an empty one. `hasMore` already knows.
		nextCursor: page.hasMore ? page.nextCursor : null,
		hasMore: page.hasMore,
	};
}
