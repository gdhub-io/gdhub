import { TeamVacancyStatus } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import { apiError, json, withAuth, withValidation } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const MaxShareQuerySchema = z.object({
	id: z.string(),
});

type MaxShareQuery = z.infer<typeof MaxShareQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		MaxShareQuerySchema,
		"query",
	)(async (_req, _ctx, { body }) => {
		const { id } = body as MaxShareQuery;

		const team = await prisma.team.findUnique({
			where: { id },
			include: {
				project: {
					include: {
						equity: {
							include: {
								equityAllocations: {
									// Only count promises that haven't been executed yet.
									// Executed promises are already converted into the
									// allocation's vested `percentage`, so counting them
									// again would double-count (matches the equity endpoint
									// used by the team page / make-promise flow).
									include: { promises: { where: { isExecuted: false } } },
								},
							},
						},
					},
				},
				vacancies: {
					where: {
						status: {
							in: [TeamVacancyStatus.Published, TeamVacancyStatus.Draft],
						},
					},
				},
			},
		});

		if (!team) {
			return apiError.notFound("Team not found");
		}

		const vacanciesPromisesSum = team.vacancies.reduce(
			(sum: number, vacancy: { promisePercentage?: number | null }) =>
				sum + (vacancy.promisePercentage || 0),
			0,
		);

		// NOTE: every EquityAllocation belongs to the project's equity (equityId is
		// required) and is optionally linked to a team member. So member allocations
		// are already included in projectPromisesSum below — counting them again here
		// double-counts and was the cause of maxAvailableShare dropping to <= 0.
		const projectPromisesSum = team.project?.equity?.equityAllocations.reduce(
			(
				sum: number,
				allocation: {
					percentage: number;
					promises: { percentage: number }[];
				},
			) =>
				sum +
				allocation.percentage +
				allocation.promises.reduce(
					(promiseSum, promise) => promiseSum + promise.percentage,
					0,
				),
			0,
		);

		const systemShares =
			(team.project?.equity?.platformShare || 0) +
			(team.project?.equity?.mentorFundShare || 0) +
			(team.project?.equity?.investmentReserve || 0);

		const totalAllocated =
			systemShares + (projectPromisesSum || 0) + vacanciesPromisesSum;

		const maxAvailableShare = 100 - totalAllocated;

		return json({ maxAvailableShare });
	}),
);
