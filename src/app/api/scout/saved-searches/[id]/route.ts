import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { getCabinet } from "@/repositories/scout";
import { prisma } from "@/services/prisma";

export const DELETE = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "scout.games.view" }),
)(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const cabinet = await getCabinet(currentUser.id);
	if (!cabinet) return apiError.notFound("Scout cabinet not found");

	// Scoped by cabinet: without it this would delete anyone's saved search.
	const { count } = await prisma.scoutSavedSearch.deleteMany({
		where: { id, cabinetId: cabinet.id },
	});

	if (!count) return apiError.notFound("Saved search not found");

	return json({ ok: true });
});
