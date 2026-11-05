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

/** GDHUB-156: the draft becomes the answer; its history keeps the old one. */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.checkpoints.manage" }),
	withValidation(ReplaceSchema),
)(async (_req, ctx, { user, body }) => {
	const admin = user as SessionUser | undefined;
	if (!admin) return apiError.unauthorized();
	const { id, entryId } = (await ctx.params) as { id: string; entryId: string };
	const { draftKey } = body as z.infer<typeof ReplaceSchema>;

	const result = await replaceDraft(id, admin.id, draftKey, { entryId });
	return result.ok ? json({ ok: true }) : replaceError(result.error);
});
