import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { deleteSpaceMembership } from "@/services/access/membership";
import { prisma } from "@/services/prisma";

/**
 * Moderation delete: staff run the catalogue but hold no role inside an event
 * space (§3.1), so this cannot go through the organiser's own endpoint — it is
 * guarded by `admin.events.manage` instead.
 */
export const DELETE = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.events.manage" }),
)(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };

	// Schedule and members go with the event through the FK cascade; the space
	// memberships that grant access to it are polymorphic and have no foreign
	// key, so nothing removes them but this call. One transaction, as in the
	// organiser's own delete.
	await prisma.$transaction(async (tx) => {
		await deleteSpaceMembership("event", id, tx);
		await tx.event.delete({ where: { id } });
	});

	return json({ success: true });
});
