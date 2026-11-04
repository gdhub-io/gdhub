import { z } from "zod";
import { PAYOUT_NOTE_MAX } from "@/config/checkpoint";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { setPayoutNote } from "@/repositories/checkpoints/payouts";

const NoteSchema = z.object({ note: z.string().max(PAYOUT_NOTE_MAX) });

/** Frame 13.3c: the note on a paid payout; empty removes it. */
export const PATCH = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.payouts.manage" }),
	withValidation(NoteSchema),
)(async (_req, ctx, { user, body }) => {
	const admin = user as SessionUser | undefined;
	if (!admin) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const saved = await setPayoutNote(
		id,
		admin.id,
		(body as z.infer<typeof NoteSchema>).note,
	);

	return saved ? json(saved) : apiError.notFound();
});
