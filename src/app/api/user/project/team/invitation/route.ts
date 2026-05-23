import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const GetInvitationQuerySchema = z.object({
	teamInvitationId: z.string(),
});

const CancelInvitationQuerySchema = z.object({
	id: z.string(),
});

type GetInvitationQuery = z.infer<typeof GetInvitationQuerySchema>;
type CancelInvitationQuery = z.infer<typeof CancelInvitationQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		GetInvitationQuerySchema,
		"query",
	)(async (_req, _ctx, { body }) => {
		const { teamInvitationId } = body as GetInvitationQuery;

		const invitation = await prisma.teamInvitation.findUnique({
			where: { id: teamInvitationId },
			include: {
				team: {
					include: {
						project: { select: { id: true, name: true, slug: true } },
					},
				},
				invitedBy: { select: { id: true, name: true, email: true } },
			},
		});

		return json(invitation);
	}),
);

export const DELETE = withAuth({ mode: "user" })(
	withValidation(
		CancelInvitationQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { id } = body as CancelInvitationQuery;

		const invitation = await prisma.teamInvitation.findUnique({
			where: { id },
			include: {
				team: {
					include: {
						members: {
							where: { userId: currentUser.id },
						},
					},
				},
			},
		});

		if (!invitation) {
			return apiError.notFound("Invitation not found");
		}

		const isTeamMember = invitation.team.members.some(
			(member: { userId: string }) => member.userId === currentUser.id,
		);

		if (!isTeamMember) {
			return apiError.forbidden(
				"You do not have permission to cancel this invitation",
			);
		}

		await prisma.teamInvitation.delete({ where: { id } });

		return json({ success: true });
	}),
);
