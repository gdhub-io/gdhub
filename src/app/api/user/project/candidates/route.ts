import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { z } from "zod";
import { json, withAuth, withValidation } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const CandidatesQuerySchema = z.object({
	teamId: z.string(),
});

type CandidatesQuery = z.infer<typeof CandidatesQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		CandidatesQuerySchema,
		"query",
	)(async (_req, _ctx, { body }) => {
		const { teamId } = body as CandidatesQuery;

		const applicants = await prisma.teamMember.findMany({
			where: {
				teamId,
				status: { equals: prismaClient.TeamMemberStatus.Applicant },
			},
			include: {
				user: {
					select: {
						id: true,
						email: true,
						name: true,
						image: true,
						specialities: { select: { id: true, name: true } },
						profile: {
							include: {
								preferredGenres: true,
								preferredLevels: true,
								preferredSettings: true,
							},
						},
					},
				},
				vacancy: true,
				speciality: true,
			},
		});

		return json(applicants);
	}),
);
