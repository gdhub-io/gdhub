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
import { rebuildStep } from "@/services/checkpoints/flows/regenerate";

/** GDHUB-156: a step's looks and answers made again from its sources, as one draft. */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.checkpoints.manage" }),
	withValidation(RegenerateSchema),
)(async (_req, ctx, { user, body }) => {
	const admin = user as SessionUser | undefined;
	if (!admin) return apiError.unauthorized();
	const { id, sprint } = (await ctx.params) as { id: string; sprint: string };
	const step = Number(sprint);
	if (!Number.isInteger(step)) return apiError.badRequest("Invalid step");
	const { hint } = body as z.infer<typeof RegenerateSchema>;

	const result = await rebuildStep(id, step, admin.id, hint || null);
	if (!result.ok) return draftError(result.error);
	return json({ draftKey: result.draftKey, changes: result.changes });
});
