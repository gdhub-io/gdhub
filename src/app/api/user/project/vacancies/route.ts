import { PayableType, TeamVacancyStatus } from "@gdhub-io/gdhub-prisma";
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
					? { equals: TeamVacancyStatus.Closed }
					: { not: TeamVacancyStatus.Closed },
			},
			include: {
				direction: { select: { name: true } },
			},
		});

		const payments = vacancies.length
			? await prisma.payment.findMany({
					where: {
						payableType: PayableType.VACANCY,
						payableId: { in: vacancies.map((v) => v.id) },
					},
					orderBy: { createdAt: "desc" },
				})
			: [];

		const paymentByVacancy = new Map<string, (typeof payments)[number]>();
		for (const payment of payments) {
			if (!paymentByVacancy.has(payment.payableId)) {
				paymentByVacancy.set(payment.payableId, payment);
			}
		}

		const result = vacancies.map((vacancy) => ({
			...vacancy,
			// Offered compensation is stored in minor units — expose it in EUR.
			offeredAmount:
				vacancy.offeredAmount != null ? vacancy.offeredAmount / 100 : null,
			payment: paymentByVacancy.get(vacancy.id) ?? null,
		}));

		return json(result);
	}),
);
