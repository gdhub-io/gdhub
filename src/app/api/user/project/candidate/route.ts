import { z } from "zod";
import { json, withAuth, withValidation } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const CandidateQuerySchema = z.object({
	id: z.string(),
});

type CandidateQuery = z.infer<typeof CandidateQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		CandidateQuerySchema,
		"query",
	)(async (_req, _ctx, { body }) => {
		const { id } = body as CandidateQuery;

		const baseTeamMember = await prisma.teamMember.findUnique({
			where: { id },
		});

		const teamMember = await prisma.teamMember.findUnique({
			where: { id },
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: baseTeamMember?.allowedContacts.includes("email") === true,
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
				vacancy: true,
				speciality: true,
			},
		});

		return json(teamMember);
	}),
);
