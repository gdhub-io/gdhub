import { z } from "zod";
import { apiError, json, withAuth, withValidation } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const ProjectsQuerySchema = z.object({
	stage: z.string().optional(),
});

type ProjectsQuery = z.infer<typeof ProjectsQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		ProjectsQuerySchema,
		"query",
	)(async (_req, _ctx, { body }) => {
		const { stage } = body as ProjectsQuery;

		try {
			const projects = await prisma.project.getProjectsOrderedByActivity({
				order: "desc",
				where: stage
					? {
							workflow: {
								is: {
									currentStep: {
										is: {
											name: stage,
										},
									},
								},
							},
						}
					: undefined,
			});

			const projectIds = projects.map((project) => project.id);
			const publishedVacancies = await prisma.teamVacancy.findMany({
				where: {
					team: {
						project: { id: { in: projectIds } },
					},
					status: "Published",
				},
				select: {
					team: {
						select: { project: { select: { id: true } } },
					},
				},
			});
			const projectIdsWithOpenPositions = new Set(
				publishedVacancies.flatMap((vacancy) =>
					vacancy.team.project?.id ? [vacancy.team.project.id] : [],
				),
			);

			const enriched = await Promise.all(
				projects.map(async (project) => ({
					...project,
					applauseCount: await prisma.project.getApplauseCount({
						projectId: project.id,
					}),
					hasOpenPositions: projectIdsWithOpenPositions.has(project.id),
				})),
			);

			return json(enriched);
		} catch (error) {
			console.error("[projects: list: error]", error);
			return apiError.badRequest("Failed to get projects");
		}
	}),
);
