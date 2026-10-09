import dayjs from "dayjs";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { CONFIRMED_MEMBERS } from "@/repositories/scout.games";
import { prisma } from "@/services/prisma";

const SummaryQuerySchema = z.object({
	projectId: z.string().min(1),
});

type SummaryQuery = z.infer<typeof SummaryQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		SummaryQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { projectId } = body as SummaryQuery;

		const teamMember = await prisma.teamMember.findFirst({
			// Someone taken back after leaving has their old row too; the summary is
			// of the place they hold now.
			where: {
				userId: currentUser.id,
				team: { project: { id: projectId } },
				...CONFIRMED_MEMBERS,
			},
			include: {
				user: { select: { profile: true } },
				team: true,
				equityAllocations: {
					include: {
						promises: {
							where: { isExecuted: false },
							include: { targetStep: true },
						},
					},
				},
			},
		});

		if (!teamMember) {
			return apiError.notFound("Team member not found");
		}

		return json({
			periodOnProject: teamMember.finishedAt
				? dayjs(teamMember.finishedAt).diff(dayjs(teamMember.startedAt), "day")
				: dayjs().diff(dayjs(teamMember.startedAt), "day"),
			availableHours: teamMember.user.profile?.timeForWork || 0,
			promisedEquity: teamMember.equityAllocations.reduce(
				(acc: number, curr: { promises: { percentage: number }[] }) =>
					acc +
					curr.promises.reduce(
						(a: number, p: { percentage: number }) => a + p.percentage,
						0,
					),
				0,
			),
			actualEquity: teamMember.equityAllocations.reduce(
				(acc: number, curr: { percentage: number }) => acc + curr.percentage,
				0,
			),
			workflowStepForVested:
				teamMember.equityAllocations[0]?.promises[0]?.targetStep?.name,
		});
	}),
);
