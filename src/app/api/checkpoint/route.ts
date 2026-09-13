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
	createDraftCheckpoint,
	getCreationBlocker,
	getUnfinishedCheckpoint,
	listClosedCheckpoints,
} from "@/repositories/checkpoint.repository";
import {
	type CheckpointListQuery,
	CheckpointListQuerySchema,
	type CreateCheckpointBody,
	CreateCheckpointSchema,
} from "@/schemas/checkpoint";

/**
 * The list answers three questions at once — what is on the go, what is behind,
 * and whether another one can be started — because the tab shows all three and a
 * second round trip would only split the same page in two.
 */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.checkpoints.view",
		idFrom: "query.projectId",
	}),
	withValidation(CheckpointListQuerySchema, "query"),
)(async (_req, _ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { projectId, page, limit } = body as CheckpointListQuery;

	const [current, closed, blocker] = await Promise.all([
		getUnfinishedCheckpoint(projectId),
		listClosedCheckpoints(projectId, { page, limit }),
		getCreationBlocker(projectId),
	]);

	return json({ current, closed, canCreate: blocker === null, blocker });
});

export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.checkpoints.create",
		idFrom: "body.projectId",
	}),
	withValidation(CreateCheckpointSchema),
)(async (_req, _ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { projectId } = body as CreateCheckpointBody;

	const blocker = await getCreationBlocker(projectId);
	if (blocker) return apiError.badRequest(blocker.reason);

	// A draft left half-written is the attempt in progress, not a second one.
	const existingDraft = await getUnfinishedCheckpoint(projectId);
	if (existingDraft) return json(existingDraft);

	return json(await createDraftCheckpoint(projectId));
});
