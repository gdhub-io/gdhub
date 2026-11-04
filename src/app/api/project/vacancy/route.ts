import { VacancyApplicationStatus } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { findPublicVacancy } from "@/repositories/vacancy/vacancy";
import { prisma } from "@/services/prisma";

const VacancyQuerySchema = z.object({
	id: z.string(),
});

type VacancyQuery = z.infer<typeof VacancyQuerySchema>;

export const GET = withAuth({ mode: "any" })(
	withValidation(
		VacancyQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const { id } = body as VacancyQuery;
		const currentUser = user as SessionUser | undefined;

		const [data, myApplication] = await Promise.all([
			findPublicVacancy(id),
			currentUser?.id
				? prisma.vacancyApplication.findFirst({
						where: {
							vacancyId: id,
							userId: currentUser.id,
							status: VacancyApplicationStatus.Submitted,
						},
						select: { id: true, createdAt: true },
					})
				: null,
		]);

		// Spreading a missing record would answer `200 {}`, which reads as a hit to
		// every caller — the job page then rendered instead of returning a 404.
		if (!data) return apiError.notFound("Vacancy not found");

		return json({ ...data, myApplication });
	}),
);
