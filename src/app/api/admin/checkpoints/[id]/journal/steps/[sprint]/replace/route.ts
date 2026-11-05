import type { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { ReplaceSchema, replaceError } from "@/lib/checkpoints/regenerate-api";
import { withSpaceGuard } from "@/lib/space-guard";
import { replaceDraft } from "@/services/checkpoints/flows/regenerate";

/** GDHUB-156: every change of a rebuilt step applied at once. */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.checkpoints.manage" }),
	withValidation(ReplaceSchema),
)(async (_req, ctx, { user, body }) => {
	const admin = user as SessionUser | undefined;
	if (!admin) return apiError.unauthorized();
	const { id, sprint } = (await ctx.params) as { id: string; sprint: string };
	const step = Number(sprint);
	if (!Number.isInteger(step)) return apiError.badRequest("Invalid step");
	const { draftKey } = body as z.infer<typeof ReplaceSchema>;

	const result = await replaceDraft(id, admin.id, draftKey, { step });
	return result.ok ? json({ ok: true }) : replaceError(result.error);
});
