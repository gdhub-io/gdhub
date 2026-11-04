import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { projectOfTeamMember } from "@/lib/space-ids";
import { prisma } from "@/services/prisma";

const TeamMemberQuerySchema = z.object({
	id: z.string(),
});

type TeamMemberQuery = z.infer<typeof TeamMemberQuerySchema>;

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.members.view",
		idFrom: projectOfTeamMember,
	}),
	withValidation(TeamMemberQuerySchema, "query"),
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
			team: {
				select: { project: { select: { id: true, name: true, slug: true } } },
			},
			speciality: true,
		},
	});

	if (!teamMember) {
		return apiError.notFound("Team member not found");
	}

	return json(teamMember);
});
