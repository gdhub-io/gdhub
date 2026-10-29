import { z } from "zod";
import { CURATOR_NOTE_MAX, CURATOR_NOTE_MIN } from "@/config/checkpoint";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { decideCurator } from "@/services/checkpoints/flows/curator-approval";

const DecisionSchema = z.discriminatedUnion("action", [
	z.object({ action: z.literal("approve") }),
	z.object({
		action: z.enum(["decline", "revoke"]),
		note: z.string().trim().min(CURATOR_NOTE_MIN).max(CURATOR_NOTE_MAX),
	}),
]);

/** Frames 13.7a–b: approve, decline or revoke an expert as a curator. */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.curators.manage" }),
	withValidation(DecisionSchema),
)(async (_req, ctx, { user, body }) => {
	const admin = user as SessionUser | undefined;
	if (!admin) return apiError.unauthorized();

	const { userId } = (await ctx.params) as { userId: string };
	const result = await decideCurator(
		admin.id,
		userId,
		body as z.infer<typeof DecisionSchema>,
	);

	if (result.ok) return json({ ok: true });
	if (result.error === "notFound") return apiError.notFound();
	return apiError.conflict(result.error);
});
