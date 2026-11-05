import type { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { draftError, RegenerateSchema } from "@/lib/checkpoints/regenerate-api";
import { withSpaceGuard } from "@/lib/space-guard";
import { regenerateEntry } from "@/services/checkpoints/flows/regenerate";

/** GDHUB-156: one AI answer written again as a draft beside the current one; nothing is saved. */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.checkpoints.manage" }),
	withValidation(RegenerateSchema),
)(async (_req, ctx, { user, body }) => {
	const admin = user as SessionUser | undefined;
	if (!admin) return apiError.unauthorized();
	const { id, entryId } = (await ctx.params) as { id: string; entryId: string };
	const { hint } = body as z.infer<typeof RegenerateSchema>;

	const result = await regenerateEntry(id, entryId, admin.id, hint || null);
	if (!result.ok) return draftError(result.error);
	return json({ draftKey: result.draftKey, changes: result.changes });
});
