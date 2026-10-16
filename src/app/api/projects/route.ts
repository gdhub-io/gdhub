import { z } from "zod";
import { apiError, json, withAuth, withValidation } from "@/lib/api-handlers";
import { getWorkedProjects } from "@/services/prisma/queries";

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
			return json(await getWorkedProjects({ stage }));
		} catch (error) {
			console.error("[projects: list: error]", error);
			return apiError.badRequest("Failed to get projects");
		}
	}),
);
