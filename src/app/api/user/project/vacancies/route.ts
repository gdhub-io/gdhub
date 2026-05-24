import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { z } from "zod";
import { json, withAuth, withValidation } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const booleanish = z.preprocess((v) => {
	if (typeof v === "boolean") return v;
	if (typeof v === "string") return v === "true";
	return undefined;
}, z.boolean().optional());

const VacanciesQuerySchema = z.object({
	teamId: z.string(),
	isArchive: booleanish,
});

type VacanciesQuery = z.infer<typeof VacanciesQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		VacanciesQuerySchema,
		"query",
	)(async (_req, _ctx, { body }) => {
		const { teamId, isArchive = false } = body as VacanciesQuery;

		const vacancies = await prisma.teamVacancy.findMany({
			where: {
				teamId,
				status: isArchive
					? { equals: prismaClient.TeamVacancyStatus.Closed }
					: { not: prismaClient.TeamVacancyStatus.Closed },
			},
		});

		return json(vacancies);
	}),
);
