import { CheckpointItemKind, CheckpointStatus } from "@gdhub-io/gdhub-prisma";
import { after } from "next/server";
import type { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { canTakeEvidence } from "@/lib/checkpoint-verdict";
import { withSpaceGuard } from "@/lib/space-guard";
import { projectOfCheckpoint } from "@/lib/space-ids";
import {
	getCheckpoint,
	withProgress,
} from "@/repositories/checkpoint.repository";
import { checkAndLook } from "@/repositories/evidence-seen";
import {
	type CheckpointEvidenceBody,
	CheckpointEvidenceSchema,
	DetachEvidenceSchema,
} from "@/schemas/checkpoint";
import { prisma } from "@/services/prisma";

/** The running checkpoint the evidence belongs to, or why it cannot take any. */
const openCheckpoint = async (id: string) => {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id },
		select: {
			status: true,
			projectId: true,
			items: {
				select: {
					id: true,
					kind: true,
					evidence: { select: { artifactId: true } },
				},
			},
		},
	});
	if (!checkpoint) return { refused: apiError.notFound() };
	// Evidence is collected while the 28 days run; once the verdict is being
	// written the card is the record the verdict is read from.
	if (
		checkpoint.status !== CheckpointStatus.Active &&
		checkpoint.status !== CheckpointStatus.Draft
	) {
		return { refused: apiError.badRequest("checkpointClosed") };
	}
	return { checkpoint };
};

const outcomeOf = (
	items: { id: string; kind: CheckpointItemKind }[],
	itemId: string,
) => {
	const item = items.find((row) => row.id === itemId);
	if (!item) return apiError.badRequest("itemNotInCheckpoint");
	// Inputs are what the project already had; they are not proven here.
	if (item.kind !== CheckpointItemKind.Outcome) {
		return apiError.badRequest("itemNotOutcome");
	}
	return null;
};

const guard = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.checkpoints.manage",
		idFrom: projectOfCheckpoint,
	}),
);

/**
 * Adds an artifact to the outcomes it proves: each keeps the
 * artifacts it already has. Its own route rather than the goal card's `PUT`,
 * which recreates the rows and would take the day-15 record with it.
 */
export const POST = guard(
	withValidation(CheckpointEvidenceSchema)(
		async (_req, ctx, { user, body }) => {
			if (!(user as SessionUser | undefined)) return apiError.unauthorized();
			const { id } = (await ctx.params) as { id: string };
			const { artifactId, itemIds } = body as CheckpointEvidenceBody;

			const { checkpoint, refused } = await openCheckpoint(id);
			if (refused) return refused;
			for (const itemId of itemIds) {
				const wrong = outcomeOf(checkpoint.items, itemId);
				if (wrong) return wrong;
			}
			const full = checkpoint.items.some(
				(item) =>
					itemIds.includes(item.id) &&
					!canTakeEvidence(
						item.evidence.map((piece) => piece.artifactId),
						artifactId,
					),
			);
			if (full) return apiError.badRequest("evidenceFull");

			const artifact = await prisma.projectArtifact.findUnique({
				where: { id: artifactId },
				select: { projectId: true, checkStatus: true },
			});
			if (!artifact) return apiError.notFound();
			if (artifact.projectId !== checkpoint.projectId) {
				return apiError.badRequest("artifactNotInProject");
			}

			await prisma.checkpointItemEvidence.createMany({
				data: itemIds.map((itemId) => ({ itemId, artifactId })),
				skipDuplicates: true,
			});
			// Older than the check itself: it becomes evidence now, so it is checked now.
			after(() =>
				checkAndLook(artifactId, { checked: !!artifact.checkStatus }),
			);

			return json(withProgress(await getCheckpoint(id)));
		},
	),
);

/** Lets one artifact go from one outcome; the outcome keeps any others. */
export const DELETE = guard(
	withValidation(DetachEvidenceSchema)(async (_req, ctx, { user, body }) => {
		if (!(user as SessionUser | undefined)) return apiError.unauthorized();
		const { id } = (await ctx.params) as { id: string };
		const { artifactId, itemId } = body as z.infer<typeof DetachEvidenceSchema>;

		const { checkpoint, refused } = await openCheckpoint(id);
		if (refused) return refused;
		const wrong = outcomeOf(checkpoint.items, itemId);
		if (wrong) return wrong;

		await prisma.checkpointItemEvidence.deleteMany({
			where: { itemId, artifactId },
		});
		return json(withProgress(await getCheckpoint(id)));
	}),
);
