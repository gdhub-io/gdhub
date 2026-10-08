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
import { closeVacancyChats } from "@/services/chat/vacancy-keys";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

const IdSchema = z.object({
	id: z.string(),
});

type IdBody = z.infer<typeof IdSchema>;

export const PUT = pipe(
	withAuth({ mode: "user" }),
	// Without this guard any signed-in user could hire a candidate into any
	// team by passing a member id.
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

	const member = await prisma.teamMember.update({
		where: { id, status: TeamMemberStatus.Applicant },
		data: {
			status: TeamMemberStatus.Hired,
			startedAt: dayjs().toISOString(),
			enteredProjectStepId: current?.team?.project?.workflow?.currentStepId,
		},
		select: { id: true, user: true, team: true, vacancy: true },
	});

	// The vacancy conversation is over — the room stays readable, but further
	// communication moves to the team (future ProjectGroup chat).
	// NB: `id` is the TeamMember id — the chat key needs the vacancy id.
	if (member.vacancy?.id) {
		try {
			await closeVacancyChats(member.vacancy.id, member.user.id, {
				notice: {
					senderUserId: currentUser.id,
					text: "🎉 The candidate was accepted into the team! This chat is closed — further communication moves to the team.",
				},
			});
		} catch (e) {
			console.error("[vacancy-chat] close on hire failed", e);
		}
	}

	// If vacancy has a promise, create an equity allocation for the member
	const hasEquityPromise =
		member.vacancy?.promisePercentage && member.vacancy?.promiseStepId;

	if (hasEquityPromise) {
		const team = await prisma.team.findUnique({
			where: { id: member.team.id },
			include: { project: { include: { equity: true } } },
		});

		if (team) {
			await prisma.equityAllocation.upsert({
				where: {
					equityId_ownerId: {
						// biome-ignore lint/style/noNonNullAssertion: original semantics
						equityId: team.project!.equity!.id,
						ownerId: member.user.id,
					},
				},
				create: {
					// biome-ignore lint/style/noNonNullAssertion: original semantics
					equityId: team.project!.equity!.id,
					ownerId: member.user.id,
					teamMemberId: member.id,
					percentage: 0,
					promises: {
						create: {
							// biome-ignore lint/style/noNonNullAssertion: original semantics
							percentage: member.vacancy!.promisePercentage!,
							// biome-ignore lint/style/noNonNullAssertion: original semantics
							targetStepId: member.vacancy!.promiseStepId!,
							createdById: member.user.id,
						},
					},
				},
				update: {
					teamMemberId: member.id,
					promises: {
						create: {
							// biome-ignore lint/style/noNonNullAssertion: original semantics
							percentage: member.vacancy!.promisePercentage!,
							// biome-ignore lint/style/noNonNullAssertion: original semantics
							targetStepId: member.vacancy!.promiseStepId!,
							createdById: member.user.id,
						},
					},
				},
			});
		}
	}

	try {
		await NovuService.send({
			template: "default-message",
			to: {
				subscriberId: member.user.id,
				// biome-ignore lint/style/noNonNullAssertion: original semantics
				email: member.user.email!,
			},
			payload: {
				title: "Accepted into the team",
				message: `You have been accepted into the team ${member.team.name}`,
				redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/hub?chat=1`,
				redirectUrlType: "internal",
			},
		});

		console.info(`New notification was sent to ${member.user.id}`);
	} catch (e) {
		console.error("[NovuService]", e);
	}

	return json({ success: true });
});
