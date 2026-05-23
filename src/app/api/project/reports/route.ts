import { z } from "zod";
import { json, withValidation } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const ProjectReportsQuerySchema = z.object({
	projectId: z.string(),
});

type ProjectReportsQuery = z.infer<typeof ProjectReportsQuerySchema>;

export const GET = withValidation(
	ProjectReportsQuerySchema,
	"query",
)(async (_req, _ctx, { body }) => {
	const { projectId } = body as ProjectReportsQuery;

	const reports = await prisma.projectReport.findMany({
		where: { projectId },
		orderBy: { publishedAt: "desc" },
		take: 5,
		include: {
			author: {
				select: {
					name: true,
					image: true,
					memberInTeams: {
						where: {
							team: {
								project: {
									id: projectId,
								},
							},
						},
						select: { position: true },
					},
					profile: {
						select: { name: true },
					},
				},
			},
		},
	});

	return json(reports);
});
