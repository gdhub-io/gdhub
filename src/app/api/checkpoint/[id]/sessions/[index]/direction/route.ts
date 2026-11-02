import type { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { confirmDirection } from "@/repositories/checkpoints/call";
import { ConfirmDirectionSchema } from "@/schemas/checkpoint";

/** The human curator confirms or changes a sprint's direction after its call (GDHUB-133). */
export const PUT = pipe(
	withAuth({ mode: "user" }),
	withValidation(ConfirmDirectionSchema),
)(async (_req, ctx, { user, body }) => {
	const me = user as SessionUser | undefined;
	if (!me) return apiError.unauthorized();
	const { id, index } = (await ctx.params) as { id: string; index: string };
	const direction = body as z.infer<typeof ConfirmDirectionSchema>;

	const confirmed = await confirmDirection(id, Number(index), me.id, direction);
	return confirmed ? json(confirmed) : apiError.forbidden();
});
