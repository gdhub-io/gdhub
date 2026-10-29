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
import { freeCheckpointProjects } from "@/repositories/checkpoints/free";
import { startFreeCheckpoint } from "@/services/checkpoints/flows/free";

const QuerySchema = z.object({ q: z.string().trim().max(100).default("") });

/** Frame 12.11.12: the projects a free checkpoint can start on. */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.checkpoints.manage" }),
	withValidation(QuerySchema, "query"),
)(async (_req, _ctx, { body }) => {
	const { q } = body as z.infer<typeof QuerySchema>;
	return json(await freeCheckpointProjects(q));
});

const StartSchema = z.object({
	projectId: z.string().min(1),
	kind: z.nativeEnum(CheckpointCuratorKind),
	userId: z.string().optional(),
	firstCall: z.coerce.date().optional(),
	reason: z.string().trim().min(3).max(500),
});

/** Frame 12.11.12: starts a checkpoint for free, as a free draft starts. */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.checkpoints.manage" }),
	withValidation(StartSchema),
)(async (_req, _ctx, { user, body }) => {
	const admin = user as SessionUser | undefined;
	if (!admin) return apiError.unauthorized();

	const result = await startFreeCheckpoint(
		admin.id,
		body as z.infer<typeof StartSchema>,
	);
	return result.ok ? json(result) : apiError.badRequest(result.error);
});
