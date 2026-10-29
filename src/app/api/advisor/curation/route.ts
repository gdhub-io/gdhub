import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import {
	getCuration,
	saveCuration,
} from "@/repositories/checkpoints/curator-approval";

/** Advisor settings → Paid work → Project curation, for whoever is asking. */
export const GET = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const expert = user as SessionUser | undefined;
	if (!expert) return apiError.unauthorized();

	return json(await getCuration(expert.id));
});

const CurationSchema = z.object({
	on: z.boolean(),
	stages: z.array(z.string().trim().min(1).max(200)).max(50),
});

export const PUT = pipe(
	withAuth({ mode: "user" }),
	withValidation(CurationSchema),
)(async (_req, _ctx, { user, body }) => {
	const expert = user as SessionUser | undefined;
	if (!expert) return apiError.unauthorized();

	const result = await saveCuration(
		expert.id,
		body as z.infer<typeof CurationSchema>,
	);
	return result.ok ? json(result.curation) : apiError.badRequest(result.error);
});
