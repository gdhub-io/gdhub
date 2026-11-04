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
import { projectOfTeamInvitation } from "@/lib/space-ids";
import { prisma } from "@/services/prisma";

const GetInvitationQuerySchema = z.object({
	teamInvitationId: z.string(),
});

const CancelInvitationQuerySchema = z.object({
	id: z.string(),
});

type GetInvitationQuery = z.infer<typeof GetInvitationQuerySchema>;
type CancelInvitationQuery = z.infer<typeof CancelInvitationQuerySchema>;

export const GET = pipe(
	withAuth({ mode: "user" }),
	withValidation(GetInvitationQuerySchema, "query"),
)(async (_req, _ctx, { user, body }) => {
	const { teamInvitationId } = body as GetInvitationQuery;
	const viewer = user as SessionUser;

	// Only the person invited, or the one who sent it, may read an invitation.
	const invitation = await prisma.teamInvitation.findFirst({
		where: {
			id: teamInvitationId,
			OR: [
				{ userId: viewer.id },
				{ invitedById: viewer.id },
				...(viewer.email
					? [{ email: { equals: viewer.email, mode: "insensitive" as const } }]
					: []),
			],
		},
		include: {
			team: {
				include: {
					project: { select: { id: true, name: true, slug: true } },
				},
			},
			invitedBy: { select: { id: true, name: true } },
		},
	});
	if (!invitation) return apiError.notFound("Invitation not found");

	return json(invitation);
});

export const DELETE = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.members.invite",
		idFrom: projectOfTeamInvitation,
	}),
	withValidation(CancelInvitationQuerySchema, "query"),
)(async (_req, _ctx, { body }) => {
	const { id } = body as CancelInvitationQuery;

	await prisma.teamInvitation.delete({ where: { id } });

	return json({ success: true });
});
