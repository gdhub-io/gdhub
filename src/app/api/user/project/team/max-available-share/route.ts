import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
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
								equityAllocations: { include: { promises: true } },
							},
						},
					},
				},
				members: {
					include: {
						equityAllocations: { include: { promises: true } },
					},
				},
				vacancies: {
					where: {
						status: {
							in: [
								prismaClient.TeamVacancyStatus.Published,
								prismaClient.TeamVacancyStatus.Draft,
							],
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

		const membersPromisesSum = team.members.reduce(
			(sum: number, member: { equityAllocations: { percentage: number }[] }) =>
				sum +
				member.equityAllocations.reduce(
					(promiseSum: number, promise: { percentage: number }) =>
						promiseSum + promise.percentage,
					0,
				),
			0,
		);

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
			systemShares +
			(projectPromisesSum || 0) +
			vacanciesPromisesSum +
			membersPromisesSum;

		const maxAvailableShare = 100 - totalAllocated;

		return json({ maxAvailableShare });
	}),
);
