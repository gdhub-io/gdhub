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
import { withSpaceGuard } from "@/lib/space-guard";
import {
	checkpointCuratorIdOf,
	missedCallsRefund,
} from "@/repositories/checkpoints/admin";
import {
	getAdvisorCheckpoint,
	getAdvisorProject,
} from "@/repositories/checkpoints/advisor";
import { getVerdictContext } from "@/repositories/checkpoints/verdict";
import { writeAdminVerdict } from "@/services/checkpoints/flows/admin";

const VerdictSchema = z.object({
	verdict: z.nativeEnum(CheckpointVerdict),
	note: z.string().trim().min(1).max(VERDICT_NOTE_MAX),
});

/**
 * What the admin's verdict dialog reads (frames 11.8, 11.8b): the curator's own
 * dialog data, read as that curator, and the calls the refund would cover.
 */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.checkpoints.view" }),
)(async (_req, ctx) => {
	const { id } = (await ctx.params) as { id: string };
	const curatorId = await checkpointCuratorIdOf(id);
	if (!curatorId) return apiError.notFound();

	const [checkpoint, context, project, missed] = await Promise.all([
		getAdvisorCheckpoint(id, curatorId),
		getVerdictContext(id, curatorId),
		getAdvisorProject(id, curatorId),
		missedCallsRefund(id),
	]);
	if (!checkpoint || !context || !project) return apiError.notFound();

	return json({
		checkpoint,
		context,
		project,
		missed: missed && {
			parts: missed.parts,
			provided: missed.provided,
			refund: missed.refund,
		},
	});
});

export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.checkpoints.manage" }),
	withValidation(VerdictSchema),
)(async (_req, ctx, { user, body }) => {
	const admin = user as SessionUser | undefined;
	if (!admin) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const result = await writeAdminVerdict(
		id,
		admin.id,
		body as z.infer<typeof VerdictSchema>,
	);

	if (result.ok) return json({ refunded: result.refunded });
	if (result.error === "notFound") return apiError.notFound();
	if (result.error === "refundFailed") return apiError.internal(result.error);
	return apiError.badRequest(result.error);
});
