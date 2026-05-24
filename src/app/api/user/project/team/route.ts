import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { z } from "zod";
import { json, withAuth, withValidation } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const UserTeamQuerySchema = z.object({
	teamId: z.string(),
});

type UserTeamQuery = z.infer<typeof UserTeamQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		UserTeamQuerySchema,
		"query",
	)(async (_req, _ctx, { body }) => {
		const { teamId } = body as UserTeamQuery;

		const team = await prisma.team.findUnique({
			where: { id: teamId },
			include: {
				members: {
					where: {
						status: {
							in: [
								prismaClient.TeamMemberStatus.Founder,
								prismaClient.TeamMemberStatus.Hired,
								prismaClient.TeamMemberStatus.Fired,
							],
						},
					},
					orderBy: { createdAt: "asc" },
					include: {
						user: {
							select: {
								name: true,
								image: true,
								profile: { select: { timeForWork: true } },
							},
						},
					},
				},
			},
		});

		return json(team);
	}),
);
