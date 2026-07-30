import { InvitationStatus } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import { json, withAuth, withValidation } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const PendingInvitationsQuerySchema = z.object({
	teamId: z.string(),
});

type PendingInvitationsQuery = z.infer<typeof PendingInvitationsQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		PendingInvitationsQuerySchema,
		"query",
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
	}),
);
