import { prisma } from "@/services/prisma";

/**
 * A devlog post as its public page shows it, or `null` when there is none to
 * show. The same for every viewer, so the page can be cached.
 */
export async function loadPublicDevlogPost(projectReportId: string) {
	const report = await prisma.projectReport.findUnique({
		where: { id: projectReportId },
		include: {
			project: {
				select: { name: true, coverImage: true, slug: true, description: true },
			},
			author: { select: { name: true, image: true } },
		},
	});

	// Generated posts have no public page: they carry no content worth an
	// indexable URL and only pollute analytics. They stay visible inside the
	// project's own feed, where they are rendered without a link.
	if (!report || report.isSystem) return null;

	const [applauseCount, previousReport, nextReport] = await Promise.all([
		prisma.projectReport.getApplauseCount({ projectReportId: report.id }),
		prisma.projectReport.findFirst({
			where: {
				projectId: report.projectId,
				publishedAt: { lt: report.publishedAt },
			},
			orderBy: { publishedAt: "desc" },
			select: { id: true },
		}),
		prisma.projectReport.findFirst({
			where: {
				projectId: report.projectId,
				publishedAt: { gt: report.publishedAt },
			},
			orderBy: { publishedAt: "asc" },
			select: { id: true },
		}),
	]);

	return {
		id: report.id,
		number: report.number,
		content: report.content,
		contentEditor: report.contentEditor,
		coverImage: report.project?.coverImage,
		createdAt: report.publishedAt.toISOString(),
		applauseCount,
		viewsCount: report.viewsCount,
		video: report.video,
		author: report.author
			? { name: report.author.name, image: report.author.image }
			: undefined,
		project: report.project
			? {
					name: report.project.name,
					slug: report.project.slug,
					description: report.project.description,
					coverImage: report.project.coverImage,
				}
			: undefined,
		previousPost: previousReport ? { id: previousReport.id } : null,
		nextPost: nextReport ? { id: nextReport.id } : null,
	};
}
