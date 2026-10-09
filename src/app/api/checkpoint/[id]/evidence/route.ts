import { CheckpointItemKind, CheckpointStatus } from "@gdhub-io/gdhub-prisma";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { projectOfCheckpoint } from "@/lib/space-ids";
import {
	getCheckpoint,
	withProgress,
} from "@/repositories/checkpoint.repository";
import {
	type CheckpointEvidenceBody,
	CheckpointEvidenceSchema,
} from "@/schemas/checkpoint";
import { prisma } from "@/services/prisma";

/**
 * Binding an artifact to the outcomes it proves.
 *
 * Its own route rather than the goal card's `PUT`: that one replaces a whole
 * side of the card, which deletes and recreates the rows — taking the day-15
 * revision, the author's notes and the curator's `acceptedNote` with them. An
 * artifact landing in week three must not cost the checkpoint its history, so
 * this writes one column on the lines that were ticked and nothing else.
 */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.checkpoints.manage",
		idFrom: projectOfCheckpoint,
	}),
	withValidation(CheckpointEvidenceSchema),
)(async (_req, ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const { artifactId, itemIds } = body as CheckpointEvidenceBody;

	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id },
		select: {
			status: true,
			projectId: true,
			items: { select: { id: true, kind: true } },
		},
	});

	if (!checkpoint) return apiError.notFound();

	// Evidence is collected while the 28 days run; once the verdict is being
	// written the card is the record the verdict is read from.
	if (
		checkpoint.status !== CheckpointStatus.Active &&
		checkpoint.status !== CheckpointStatus.Draft
	) {
		return apiError.badRequest("checkpointClosed");
	}

	for (const itemId of itemIds) {
		const item = checkpoint.items.find((row) => row.id === itemId);

		if (!item) return apiError.badRequest("itemNotInCheckpoint");
		// Inputs are what the project already had; they are not proven here.
		if (item.kind !== CheckpointItemKind.Outcome) {
			return apiError.badRequest("itemNotOutcome");
		}
	}

	if (artifactId) {
		const artifact = await prisma.projectArtifact.findUnique({
			where: { id: artifactId },
			select: { projectId: true },
		});

		if (!artifact) return apiError.notFound();
		if (artifact.projectId !== checkpoint.projectId) {
			return apiError.badRequest("artifactNotInProject");
		}
	}

	await prisma.checkpointItem.updateMany({
		where: { id: { in: itemIds }, checkpointId: id },
		data: { artifactId },
	});

	return json(withProgress(await getCheckpoint(id)));
});
