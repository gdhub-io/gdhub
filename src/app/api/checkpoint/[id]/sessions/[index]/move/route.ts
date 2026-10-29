import type { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import {
	callMoveOptions,
	withdrawCallMove,
} from "@/repositories/checkpoints/call-move";
import { AnswerCallMoveSchema, AskCallMoveSchema } from "@/schemas/checkpoint";
import {
	answerCallMove,
	askCallMove,
} from "@/services/checkpoints/flows/call-move";

/**
 * Moving one call (GDHUB-90): the free hours it may take, a request, the other
 * side's answer, and taking the request back. The right comes from the
 * checkpoint — its curator or the project's author — not from the space.
 */

type Params = { id: string; index: string };

const answer = (result: { ok: true } | { ok: false; error: string }) => {
	if (result.ok) return json({ ok: true });
	if (result.error === "notFound") return apiError.notFound();
	if (result.error === "notAllowed") return apiError.forbidden();
	return apiError.badRequest(result.error);
};

const caller = (user: unknown) => user as SessionUser | undefined;

export const GET = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const me = caller(user);
	if (!me) return apiError.unauthorized();
	const { id, index } = (await ctx.params) as Params;

	const result = await callMoveOptions(id, Number(index), me.id);
	return result.ok ? json(result.options) : answer(result);
});

export const POST = pipe(
	withAuth({ mode: "user" }),
	withValidation(AskCallMoveSchema),
)(async (_req, ctx, { user, body }) => {
	const me = caller(user);
	if (!me) return apiError.unauthorized();
	const { id, index } = (await ctx.params) as Params;
	const { moveTo } = body as z.infer<typeof AskCallMoveSchema>;

	return answer(await askCallMove(id, Number(index), me.id, new Date(moveTo)));
});

export const PATCH = pipe(
	withAuth({ mode: "user" }),
	withValidation(AnswerCallMoveSchema),
)(async (_req, ctx, { user, body }) => {
	const me = caller(user);
	if (!me) return apiError.unauthorized();
	const { id, index } = (await ctx.params) as Params;
	const { approve } = body as z.infer<typeof AnswerCallMoveSchema>;

	return answer(await answerCallMove(id, Number(index), me.id, approve));
});

export const DELETE = withAuth({ mode: "user" })(
	async (_req, ctx, { user }) => {
		const me = caller(user);
		if (!me) return apiError.unauthorized();
		const { id, index } = (await ctx.params) as Params;

		return answer(await withdrawCallMove(id, Number(index), me.id));
	},
);
