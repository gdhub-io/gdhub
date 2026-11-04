import { InvitationStatus } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import { json, pipe, withAuth, withValidation } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { projectOfTeam } from "@/lib/space-ids";
import { prisma } from "@/services/prisma";

const PendingInvitationsQuerySchema = z.object({
	teamId: z.string(),
});

type PendingInvitationsQuery = z.infer<typeof PendingInvitationsQuerySchema>;

// An invitation's id is the token its link carries; only those who may invite
// see them.
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.members.invite",
		idFrom: projectOfTeam,
	}),
	withValidation(PendingInvitationsQuerySchema, "query"),
)(async (_req, _ctx, { body }) => {
	const { teamId } = body as PendingInvitationsQuery;

	const pendingInvitations = await prisma.teamInvitation.findMany({
		where: {
			teamId,
			status: InvitationStatus.Pending,
		},
		orderBy: { createdAt: "desc" },
	});

	return json(pendingInvitations);
});
