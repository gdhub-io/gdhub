import { TeamMemberStatus } from "@gdhub-io/gdhub-prisma";
import dayjs from "dayjs";
import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { projectOfTeamMember } from "@/lib/space-ids";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

const IdSchema = z.object({
	id: z.string(),
});

type IdBody = z.infer<typeof IdSchema>;

export const PUT = pipe(
	withAuth({ mode: "user" }),
	// Without this guard any signed-in user could remove anyone from any team
	// by passing a member id.
	withSpaceGuard({
		permission: "project.vacancies.review",
		idFrom: projectOfTeamMember,
	}),
	withValidation(IdSchema),
)(async (_req, _ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = body as IdBody;

	// `id` is the team member's, so the project's step is read through them.
	const current = await prisma.teamMember.findUnique({
		where: { id },
		select: {
			team: {
				select: {
					project: {
						select: { workflow: { select: { currentStepId: true } } },
					},
				},
			},
		},
	});

	const firedMember = await prisma.teamMember.update({
		where: { id, status: TeamMemberStatus.Hired },
		data: {
			status: TeamMemberStatus.Fired,
			finishedAt: dayjs().toISOString(),
			leftProjectStepId: current?.team?.project?.workflow?.currentStepId,
		},
		select: { user: true, team: true },
	});

	// Delete all equity allocations for the fired member
	await prisma.equityPromise.deleteMany({
		where: { allocation: { teamMemberId: id } },
	});
	await prisma.equityAllocation.updateMany({
		where: { teamMemberId: id },
		data: { teamMemberId: { set: null } },
	});

	try {
		await NovuService.send({
			template: "default-message",
			to: {
				subscriberId: firedMember.user.id,
				// biome-ignore lint/style/noNonNullAssertion: original semantics
				email: firedMember.user.email!,
			},
			payload: {
				title: "Candidate fired",
				message: `You have been kicked off the team ${firedMember.team.name}`,
			},
		});

		console.info(`New notification was sent to ${firedMember.user.id}`);
	} catch (e) {
		console.error("[NovuService]", e);
	}

	return json({ success: true });
});
