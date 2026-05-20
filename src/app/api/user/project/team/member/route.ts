import { z } from "zod";
import { apiError, json, withAuth, withValidation } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const TeamMemberQuerySchema = z.object({
	id: z.string(),
});

type TeamMemberQuery = z.infer<typeof TeamMemberQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		TeamMemberQuerySchema,
		"query",
	)(async (_req, _ctx, { body }) => {
		const { id } = body as TeamMemberQuery;

		const teamMember = await prisma.teamMember.findUnique({
			where: { id },
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
						profile: {
							include: {
								preferredGenres: true,
								preferredLevels: true,
								preferredSettings: true,
							},
						},
					},
				},
				team: { select: { project: true } },
				speciality: true,
			},
		});

		if (!teamMember) {
			return apiError.notFound("Team member not found");
		}

		return json(teamMember);
	}),
);
