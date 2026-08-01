import { apiError, json } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

type Params = Promise<{ projectReportId: string }>;

export async function GET(_req: Request, { params }: { params: Params }) {
	try {
		const { projectReportId } = await params;

		if (!projectReportId) {
			return apiError.badRequest("Project report ID is required");
		}

		const report = await prisma.projectReport.findUnique({
			where: { id: projectReportId },
			include: {
				project: {
					select: {
						name: true,
						coverImage: true,
						slug: true,
						description: true,
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

		if (!report) {
			return apiError.notFound("Project report not found");
		}

		// Generated posts have no public page: they carry no content worth an
		// indexable URL and only pollute analytics. They stay visible inside the
		// project's own feed, where they are rendered without a link.
		if (report.isSystem) {
			return apiError.notFound("Project report not found");
		}

		const applauseCount = await prisma.projectReport.getApplauseCount({
			projectReportId: report.id,
		});

		const previousReport = await prisma.projectReport.findFirst({
			where: {
				projectId: report.projectId,
				publishedAt: {
					lt: report.publishedAt,
				},
			},
			orderBy: {
				publishedAt: "desc",
			},
			select: {
				id: true,
			},
		});

		const nextReport = await prisma.projectReport.findFirst({
			where: {
				projectId: report.projectId,
				publishedAt: {
					gt: report.publishedAt,
				},
			},
			orderBy: {
				publishedAt: "asc",
			},
			select: {
				id: true,
			},
		});

		// Transform the data to match the expected format in the frontend
		const post = {
			id: report.id,
			content: report.content,
			contentEditor: report.contentEditor,
			coverImage: report.project?.coverImage,
			createdAt: report.publishedAt,
			applauseCount,
			video: report.video,
			author: report.author
				? {
						name: report.author.name,
						image: report.author.image,
					}
				: undefined,
			project: report.project
				? {
						name: report.project.name,
						slug: report.project.slug,
						description: report.project.description,
						coverImage: report.project.coverImage,
					}
				: undefined,
			previousPost: previousReport
				? {
						id: previousReport.id,
					}
				: null,
			nextPost: nextReport
				? {
						id: nextReport.id,
					}
				: null,
		};

		return json(post);
	} catch (error) {
		console.error("Error fetching project report:", error);
		return apiError.internal();
	}
}
