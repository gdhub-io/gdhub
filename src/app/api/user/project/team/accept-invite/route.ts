import {
	InvitationStatus,
	type Speciality,
	TeamMemberStatus,
} from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import {
	addToCheckpointRooms,
	syncChat,
} from "@/services/chat/checkpoint-room";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

const AcceptInviteQuerySchema = z.object({
	token: z.string(),
});

type AcceptInviteQuery = z.infer<typeof AcceptInviteQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		AcceptInviteQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { token } = body as AcceptInviteQuery;

		try {
			const invitation = await prisma.teamInvitation.findUnique({
				where: { id: token },
				include: {
					team: {
						include: {
							project: { select: { id: true, name: true, slug: true } },
						},
					},
					invitedBy: { select: { id: true, name: true, email: true } },
				},
			});

			if (!invitation) {
				return apiError.notFound("Invitation not found");
			}

			if (invitation.expiresAt && new Date() > invitation.expiresAt) {
				return apiError.badRequest("Invitation has expired");
			}

			if (invitation.status === InvitationStatus.Accepted) {
				return apiError.badRequest("Invitation has already been accepted");
			}

			if (
				invitation.email !== currentUser.email &&
				(!invitation.userId || invitation.userId !== currentUser.id)
			) {
				return apiError.forbidden("This invitation is not for you");
			}

			const userRecord = await prisma.user.findUnique({
				where: { id: currentUser.id },
				include: { profile: true, specialities: true },
			});

			if (!userRecord) {
				return apiError.notFound("User not found");
			}

			await prisma.teamInvitation.update({
				where: { id: token },
				data: {
					status: InvitationStatus.Accepted,
					acceptedAt: new Date(),
					user: { connect: { id: currentUser.id } },
				},
			});

			const hasCompletedOnboarding = userRecord.onboardingDone;
			const hasSpeciality =
				userRecord.specialities &&
				userRecord.specialities.filter(
					(speciality: Speciality) =>
						speciality.workDirectionId === invitation.directionId,
				).length > 0;

			if (!hasCompletedOnboarding || !hasSpeciality) {
				await prisma.user.update({
					where: { id: currentUser.id },
					data: {
						pendingTeamInvitations: {
							push: {
								invitationId: invitation.id,
								teamId: invitation.teamId,
								position: invitation.position,
								directionId: invitation.directionId,
								startedAt: invitation.startedAt,
							},
						},
					},
				});

				try {
					await NovuService.send({
						template: "invitation-accepted-pending",
						to: {
							subscriberId: invitation.invitedBy.id,
							email: invitation.invitedBy.email || undefined,
						},
						payload: {
							invitationId: invitation.id,
							teamName: invitation.team.name || "Team",
							projectName: invitation.team.project?.name || "Project",
							projectSlug: invitation.team.project?.slug || "",
							position: invitation.position,
							memberName: currentUser.name || "New member",
							memberEmail: currentUser.email,
							pendingReason: !hasCompletedOnboarding
								? "onboarding"
								: "speciality",
						},
					});
				} catch (error) {
					console.error("Failed to send notification to inviter:", error);
				}

				if (!hasCompletedOnboarding) {
					return json({
						success: true,
						message: "You need to complete onboarding before joining the team",
						redirect: `/registration/onboarding?pendingInvitation=${invitation.id}`,
					});
				}
				return json({
					success: true,
					message: "You need to create a speciality before joining the team",
					redirect: `/user/settings/specialities?pendingInvitation=${invitation.id}`,
				});
			}

			const teamMember = await prisma.teamMember.create({
				data: {
					position: invitation.position,
					speciality: { connect: { id: userRecord.specialities[0].id } },
					status: TeamMemberStatus.Hired,
					startedAt: invitation.startedAt,
					team: { connect: { id: invitation.teamId } },
					user: { connect: { id: currentUser.id } },
				},
			});

			const projectId = invitation.team.project?.id;
			if (projectId) {
				await syncChat(`join ${teamMember.id}`, () =>
					addToCheckpointRooms(projectId, currentUser.id),
				);
			}

			try {
				await NovuService.send({
					template: "invitation-accepted",
					to: {
						subscriberId: invitation.invitedBy.id,
						email: invitation.invitedBy.email || undefined,
					},
					payload: {
						teamMemberId: teamMember.id,
						teamName: invitation.team.name || "Team",
						projectName: invitation.team.project?.name || "Project",
						projectSlug: invitation.team.project?.slug || "",
						position: invitation.position,
						memberName: currentUser.name || "New member",
						memberEmail: currentUser.email,
					},
				});
			} catch (error) {
				console.error("Failed to send notification to inviter:", error);
			}

			return json({
				success: true,
				message: "You have successfully joined the team",
				redirect: `/user/project/${invitation.team.project?.slug || invitation.team.project?.id}`,
			});
		} catch (error) {
			console.error("[team.accept-invite]", error);
			return apiError.internal(
				error instanceof Error ? error.message : "Unknown error",
			);
		}
	}),
);
