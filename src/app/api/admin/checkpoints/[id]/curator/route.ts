import { z } from "zod";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { assignCurator } from "@/services/checkpoints/flows/admin";

const AssignSchema = z.object({
	kind: z.nativeEnum(CheckpointCuratorKind),
	userId: z.string().optional(),
	reason: z.string().trim().min(3).max(500),
});

/** Frames `z20Q3F` (running) and 11.9 (draft, given for free). */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.checkpoints.manage" }),
	withValidation(AssignSchema),
)(async (_req, ctx, { user, body }) => {
	const admin = user as SessionUser | undefined;
	if (!admin) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const result = await assignCurator(
		id,
		admin.id,
		body as z.infer<typeof AssignSchema>,
	);

	if (result.ok) return json({ ok: true });
	if (result.error === "notFound") return apiError.notFound();
	return apiError.badRequest(result.error);
});
