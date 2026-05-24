import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export const GET = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { teamInvitationId } = (await ctx.params) as {
		teamInvitationId: string;
	};

	const userRecord = await prisma.user.findUnique({
		where: { id: currentUser.id },
	});

	const pendingInvitation = (
		userRecord?.pendingTeamInvitations as Array<{ invitationId: string }> | null
	)?.find((r) => r.invitationId === teamInvitationId);

	console.log(pendingInvitation);

	return json(pendingInvitation);
});
