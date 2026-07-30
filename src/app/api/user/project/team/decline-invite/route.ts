import { InvitationStatus } from "@gdhub-io/gdhub-prisma";
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

const DeclineInviteQuerySchema = z.object({
	token: z.string(),
});

type DeclineInviteQuery = z.infer<typeof DeclineInviteQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		DeclineInviteQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { token } = body as DeclineInviteQuery;

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

			if (
				invitation.email !== currentUser.email &&
				(!invitation.userId || invitation.userId !== currentUser.id)
			) {
				return apiError.forbidden("This invitation is not for you");
			}

			await prisma.teamInvitation.update({
				where: { id: token },
				data: { status: InvitationStatus.Declined },
			});

			try {
				await NovuService.send({
					template: "invitation-declined",
					to: {
						subscriberId: invitation.invitedBy.id,
						email: invitation.invitedBy.email || undefined,
					},
					payload: {
						teamName: invitation.team.name || "Team",
						projectName: invitation.team.project?.name || "Project",
						projectSlug: invitation.team.project?.slug || "",
						position: invitation.position,
						memberName: currentUser.name || "User",
						memberEmail: currentUser.email,
					},
				});
			} catch (error) {
				console.error("Failed to send notification to inviter:", error);
			}

			return json({ success: true, message: "Invitation declined" });
		} catch (error) {
			console.error("[team.decline-invite]", error);
			return apiError.internal(
				error instanceof Error ? error.message : "Unknown error",
			);
		}
	}),
);
