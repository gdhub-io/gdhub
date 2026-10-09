import { z } from "zod";
import { VERDICT_NOTE_MAX } from "@/config/checkpoint";
import { CheckpointVerdict } from "@/config/prisma-enums";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import {
	type CuratorVerdictResult,
	getVerdictContext,
	saveVerdictDraft,
	writeCuratorVerdict,
} from "@/repositories/checkpoint-verdict.repository";

const verdict = z.enum([
	CheckpointVerdict.StageClosed,
	CheckpointVerdict.GoalMet,
	CheckpointVerdict.GoalMissed,
]);

const VerdictSchema = z.object({
	verdict,
	note: z.string().trim().min(1).max(VERDICT_NOTE_MAX),
});

/** A draft may be half written: no choice yet, or no reasoning yet. */
const DraftSchema = z.object({
	verdict: verdict.nullable(),
	note: z.string().trim().max(VERDICT_NOTE_MAX),
});

const answer = (result: CuratorVerdictResult) => {
	if (result.ok) return json({ ok: true });
	if (result.reason === "notFound") return apiError.notFound();
	if (result.reason === "notOpen")
		return apiError.badRequest("The verdict cannot be written yet");
	return apiError.badRequest("The verdict has already been sent");
};

/**
 * The human curator's verdict. Like the rest of the advisor's checkpoint
 * routes, being named on the checkpoint is the right; anything else is a 404.
 */
export const GET = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const curator = user as SessionUser | undefined;
	if (!curator) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const context = await getVerdictContext(id, curator.id);

	return context ? json(context) : apiError.notFound();
});

export const PUT = pipe(
	withAuth({ mode: "user" }),
	withValidation(DraftSchema),
)(async (_req, ctx, { user, body }) => {
	const curator = user as SessionUser | undefined;
	if (!curator) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };

	return answer(
		await saveVerdictDraft(id, curator.id, body as z.infer<typeof DraftSchema>),
	);
});

export const POST = pipe(
	withAuth({ mode: "user" }),
	withValidation(VerdictSchema),
)(async (_req, ctx, { user, body }) => {
	const curator = user as SessionUser | undefined;
	if (!curator) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };

	return answer(
		await writeCuratorVerdict(
			id,
			curator.id,
			body as z.infer<typeof VerdictSchema>,
		),
	);
});
