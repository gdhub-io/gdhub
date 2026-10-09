import { z } from "zod";
import { json, pipe, withAuth, withValidation } from "@/lib/api-handlers";
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
