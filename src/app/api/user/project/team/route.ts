import { TeamMemberStatus } from "@gdhub-io/gdhub-prisma";
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
								TeamMemberStatus.Founder,
								TeamMemberStatus.Hired,
								TeamMemberStatus.Fired,
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
						// Offered compensation of the vacancy the member applied through,
						// so the table can show paid-vacancy terms (amount + rate type).
						vacancy: {
							select: { offeredAmount: true, offeredRateType: true },
						},
					},
				},
			},
		});

		if (!team) return json(team);

		// `offeredAmount` is stored in minor units (cents); expose major units
		// (euros) to match the client display convention.
		const members = team.members.map((member) => ({
			...member,
			vacancy: member.vacancy
				? {
						...member.vacancy,
						offeredAmount:
							member.vacancy.offeredAmount != null
								? member.vacancy.offeredAmount / 100
								: null,
					}
				: null,
		}));

		return json({ ...team, members });
	}),
);
