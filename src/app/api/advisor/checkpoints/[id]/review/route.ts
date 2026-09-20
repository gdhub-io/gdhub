import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const ReviewSchema = z.object({
	devlogId: z.string(),
	text: z.string().trim().min(1).max(4000),
});

/**
 * The curator's review of one sprint.
 *
 * It is written onto that sprint's devlog, which is where a review lives until
 * the schema holds one of its own — so a sprint nobody wrote a devlog for cannot
 * be reviewed yet, and the curator's four answers are four devlog answers.
 *
 * Only the curator named on the checkpoint, and only onto a devlog belonging to
 * it: the devlog id comes from the browser and is checked against both.
 */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withValidation(ReviewSchema),
)(async (_req, ctx, { user, body }) => {
	const curator = user as SessionUser | undefined;
	if (!curator) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const { devlogId, text } = body as z.infer<typeof ReviewSchema>;

	const devlog = await prisma.projectReport.findFirst({
		where: {
			id: devlogId,
			checkpointId: id,
			checkpoint: { curatorId: curator.id },
		},
		select: { id: true },
	});

	if (!devlog) return apiError.notFound();

	const saved = await prisma.projectReport.update({
		where: { id: devlog.id },
		data: { curatorFeedback: text, curatorFeedbackAt: new Date() },
		select: { curatorFeedback: true, curatorFeedbackAt: true },
	});

	return json(saved);
});
