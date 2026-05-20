import { z } from "zod";
import { json, withAuth, withValidation } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const ProjectDetailsQuerySchema = z.object({
	projectId: z.string(),
});

type ProjectDetailsQuery = z.infer<typeof ProjectDetailsQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		ProjectDetailsQuerySchema,
		"query",
	)(async (_req, _ctx, { body }) => {
		const { projectId } = body as ProjectDetailsQuery;

		const project = await prisma.project.findFirst({
			where: { id: projectId },
			include: {
				author: { select: { id: true, name: true, image: true } },
				workflow: { select: { steps: true } },
			},
		});

		return json(project);
	}),
);
