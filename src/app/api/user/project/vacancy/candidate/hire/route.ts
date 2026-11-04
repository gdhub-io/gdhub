import {
	TeamMemberStatus,
	VacancyApplicationStatus,
} from "@gdhub-io/gdhub-prisma";
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
import { projectOfApplication } from "@/lib/space-ids";
import {
	reconcileCheckpointRooms,
	syncChat,
} from "@/services/chat/checkpoint-room";
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
	// team by passing an application id.
	withSpaceGuard({
		permission: "project.vacancies.review",
		idFrom: projectOfApplication,
	}),
	withValidation(IdSchema),
)(async (_req, _ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = body as IdBody;

	// `id` is the team member's, so the project's step is read through them.
	// The member is made from the application and linked to it; the application
	// itself stays as the record of how they came (GDHUB-127).
	const member = await prisma.$transaction(async (tx) => {
		const application = await tx.vacancyApplication.update({
			where: { id, status: VacancyApplicationStatus.Submitted },
			data: { status: VacancyApplicationStatus.Hired, decidedAt: new Date() },
			select: {
				userId: true,
				specialityId: true,
				vacancy: {
					select: {
						id: true,
						title: true,
						teamId: true,
						team: {
							select: {
								project: {
									select: { workflow: { select: { currentStepId: true } } },
								},
							},
						},
					},
				},
			},
		});

		return tx.teamMember.create({
			data: {
				userId: application.userId,
				teamId: application.vacancy.teamId,
				specialityId: application.specialityId,
				vacancyId: application.vacancy.id,
				applicationId: id,
				position: application.vacancy.title,
				status: TeamMemberStatus.Hired,
				startedAt: dayjs().toISOString(),
				enteredProjectStepId:
					application.vacancy.team.project?.workflow?.currentStepId,
			},
			select: { id: true, user: true, team: true, vacancy: true },
		});
	});

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

	const projectId = member.team.projectId;
	if (projectId) {
		await syncChat(`hire ${member.id}`, () =>
			reconcileCheckpointRooms(projectId, member.user.id),
		);
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
