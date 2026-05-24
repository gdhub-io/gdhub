import { z } from "zod";
import { json, withValidation } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const VacanciesQuerySchema = z.object({
	teamId: z.string(),
});

type VacanciesQuery = z.infer<typeof VacanciesQuerySchema>;

export const GET = withValidation(
	VacanciesQuerySchema,
	"query",
)(async (_req, _ctx, { body }) => {
	const { teamId } = body as VacanciesQuery;

	const vacancies = await prisma.teamVacancy.findMany({
		where: { status: "Published", teamId },
		include: {
			direction: { select: { name: true } },
			team: { select: { project: { select: { name: true } } } },
		},
		orderBy: { publishedAt: "desc" },
	});

	return json(vacancies);
});
