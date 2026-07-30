import { AdviceRequestStatus } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import { json, withAuth, withValidation } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const AdvisorsQuerySchema = z.object({
	teamId: z.string(),
});

type AdvisorsQuery = z.infer<typeof AdvisorsQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		AdvisorsQuerySchema,
		"query",
	)(async (_req, _ctx, { body }) => {
		const { teamId } = body as AdvisorsQuery;

		const team = await prisma.team.findUnique({
			where: { id: teamId },
			select: {
				project: { select: { id: true } },
			},
		});

		const teamAdvisors = await prisma.user.findMany({
			where: {
				adviceRequestsForMe: {
					some: { projectId: team?.project?.id },
				},
			},
			include: {
				_count: {
					select: {
						adviceRequestsForMe: {
							where: { status: AdviceRequestStatus.Approved },
						},
					},
				},
				profile: { select: { name: true } },
				specialities: { select: { id: true, name: true } },
			},
		});

		return json(teamAdvisors);
	}),
);
