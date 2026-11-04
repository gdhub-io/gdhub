import { VacancyApplicationStatus } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import { json, pipe, withAuth, withValidation } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { projectOfTeam } from "@/lib/space-ids";
import { prisma } from "@/services/prisma";

const CandidatesQuerySchema = z.object({
	teamId: z.string(),
});

type CandidatesQuery = z.infer<typeof CandidatesQuerySchema>;

/** The open applications to a team's positions; their emails make this the project's business only. */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.vacancies.review",
		idFrom: projectOfTeam,
	}),
	withValidation(CandidatesQuerySchema, "query"),
)(async (_req, _ctx, { body }) => {
	const { teamId } = body as CandidatesQuery;

	const applicants = await prisma.vacancyApplication.findMany({
		where: {
			vacancy: { teamId },
			status: VacancyApplicationStatus.Submitted,
		},
		orderBy: { createdAt: "desc" },
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
});
