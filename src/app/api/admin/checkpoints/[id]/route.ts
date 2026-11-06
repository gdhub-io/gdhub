import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { deleteFreeCheckpoint } from "@/services/checkpoints/flows/admin";

/** Deletes a checkpoint given for free; a paid one is refused. */
export const DELETE = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.checkpoints.delete" }),
)(async (_req, ctx, { user }) => {
	const admin = user as SessionUser | undefined;
	if (!admin) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const result = await deleteFreeCheckpoint(id, admin.id);

	if (result.ok) return json({ deleted: true });
	if (result.error === "notFound") return apiError.notFound();
	return apiError.badRequest(result.error);
});
