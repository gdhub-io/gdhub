import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

// Published vacancies across the current user's own projects — powers the
// talent-pool "Offer a position" picker.
export const GET = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const vacancies = await prisma.teamVacancy.findMany({
		where: {
			status: prismaClient.TeamVacancyStatus.Published,
			team: { project: { authorId: currentUser.id } },
		},
		select: {
			id: true,
			title: true,
			team: { select: { project: { select: { id: true, name: true } } } },
		},
		orderBy: { createdAt: "desc" },
	});

	return json(
		vacancies.map((vacancy) => ({
			id: vacancy.id,
			title: vacancy.title,
			project: vacancy.team?.project ?? null,
		})),
	);
});
