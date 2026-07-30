import {
	InvitationStatus,
	type Prisma,
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
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

const CompletePendingInvitationQuerySchema = z.object({
	invitationId: z.string(),
});

type CompletePendingInvitationQuery = z.infer<
	typeof CompletePendingInvitationQuerySchema
>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		CompletePendingInvitationQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { invitationId } = body as CompletePendingInvitationQuery;

		try {
			const userRecord = await prisma.user.findUnique({
				where: { id: currentUser.id },
				include: { specialities: true },
			});

			if (!userRecord) {
				return apiError.notFound("User not found");
			}

			if (!userRecord.onboardingDone) {
				return apiError.badRequest("You need to complete onboarding first");
			}

			if (!userRecord.specialities || userRecord.specialities.length === 0) {
				return apiError.badRequest("You need to create a speciality first");
			}

			const invitation = await prisma.teamInvitation.findUnique({
				where: { id: invitationId },
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

			if (
				invitation.email !== currentUser.email &&
				(!invitation.userId || invitation.userId !== currentUser.id)
			) {
				return apiError.forbidden("This invitation is not for you");
			}

			if (invitation.status !== InvitationStatus.Accepted) {
				return apiError.badRequest("Invitation has not been accepted");
			}

			const pendingInvitation = userRecord.pendingTeamInvitations?.find(
				(inv: any) => inv.invitationId === invitationId,
			) as Record<string, any> | undefined;

			if (!pendingInvitation) {
				return apiError.notFound("Pending invitation not found");
			}

			const neededSpeciality = userRecord.specialities.find(
				(s: { workDirectionId: string }) =>
					s.workDirectionId === pendingInvitation.directionId,
			);

			if (!neededSpeciality) {
				return apiError.notFound("Speciality not found");
			}

			const teamMember = await prisma.teamMember.create({
				data: {
					position: pendingInvitation.position,
					status: TeamMemberStatus.Hired,
					startedAt: new Date(pendingInvitation.startedAt),
					speciality: { connect: { id: neededSpeciality.id } },
					team: { connect: { id: pendingInvitation.teamId } },
					user: { connect: { id: currentUser.id } },
				},
			});

			const updatedPendingInvitations =
				userRecord.pendingTeamInvitations.filter(
					(inv: any) => inv.invitationId !== invitationId,
				);

			await prisma.user.update({
				where: { id: currentUser.id },
				data: {
					pendingTeamInvitations:
						updatedPendingInvitations as Prisma.InputJsonValue[],
				},
			});

			try {
				await NovuService.send({
					template: "invitation-completed",
					to: {
						subscriberId: invitation.invitedBy.id,
						email: invitation.invitedBy.email || undefined,
					},
					payload: {
						teamMemberId: teamMember.id,
						teamName: invitation.team.name || "Team",
						projectName: invitation.team.project?.name || "Project",
						projectSlug: invitation.team.project?.slug || "",
						position: pendingInvitation.position,
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
			console.error("[team.complete-pending-invitation]", error);
			return apiError.internal(
				error instanceof Error ? error.message : "Unknown error",
			);
		}
	}),
);
