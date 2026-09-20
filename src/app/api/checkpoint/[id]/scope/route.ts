import { CheckpointItemKind, CheckpointStatus } from "@gdhub-io/gdhub-prisma";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { checkpointDay } from "@/lib/checkpoint-days";
import { withSpaceGuard } from "@/lib/space-guard";
import { projectOfCheckpoint } from "@/lib/space-ids";
import {
	getCheckpoint,
	withProgress,
} from "@/repositories/checkpoint.repository";
import {
	CHECKPOINT_MAX_ITEMS_PER_KIND,
	CHECKPOINT_SCOPE_DAY,
	type CheckpointScopeBody,
	type CheckpointScopeChange,
	CheckpointScopeSchema,
} from "@/schemas/checkpoint";
import { prisma } from "@/services/prisma";

type OutcomeRow = { id: string; text: string; originalText: string | null };

/**
 * The day-14 answer to the curator's scope note: cut, reword, add — once, in one
 * transaction, and with the reason stored beside it.
 *
 * Nothing is written over. A cut keeps its text, a rewording keeps the day-1
 * wording in `originalText`, and an added line is dated, so a closed checkpoint
 * can still say what was planned and what changed.
 */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.checkpoints.manage",
		idFrom: projectOfCheckpoint,
	}),
	withValidation(CheckpointScopeSchema),
)(async (_req, ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const { note, changes, added } = body as CheckpointScopeBody;

	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id },
		select: {
			status: true,
			startedAt: true,
			revisedAt: true,
			items: {
				select: {
					id: true,
					kind: true,
					order: true,
					text: true,
					originalText: true,
				},
			},
		},
	});

	if (!checkpoint) return apiError.notFound();

	if (checkpoint.status !== CheckpointStatus.Active) {
		return apiError.badRequest("checkpointNotActive");
	}

	// The scope changes once: a second pass would be editing the record of the
	// first rather than the plan.
	if (checkpoint.revisedAt) {
		return apiError.badRequest("checkpointAlreadyRevised");
	}

	// Day 14 is when the curator asks, and the answer is taken from that day
	// until the checkpoint closes. The standard names one day, but the note is a
	// question the author answers in their own time; refusing a day-16 reply
	// would leave the verdict judged against a list everyone knew was wrong.
	// `Active` is what holds the far end — a closed checkpoint never gets here.
	const day = checkpoint.startedAt ? checkpointDay(checkpoint.startedAt) : null;

	if (day === null || day < CHECKPOINT_SCOPE_DAY) {
		return apiError.badRequest("scopeChangeTooEarly");
	}

	const outcomes = checkpoint.items.filter(
		(item) => item.kind === CheckpointItemKind.Outcome,
	);
	const byId = new Map(outcomes.map((item) => [item.id, item]));
	const updates: { item: OutcomeRow; change: CheckpointScopeChange }[] = [];

	for (const change of changes) {
		const item = byId.get(change.itemId);

		if (!item) {
			// An input of this checkpoint and a line of another one are different
			// mistakes: the first is the wrong side of the card, the second is the
			// wrong checkpoint.
			const isOwnItem = checkpoint.items.some(
				(row) => row.id === change.itemId,
			);

			return apiError.badRequest(
				isOwnItem ? "itemNotOutcome" : "itemNotInCheckpoint",
			);
		}

		updates.push({ item, change });
	}

	// A cut line stays on the card and keeps its slot, so it still counts here.
	if (outcomes.length + added.length > CHECKPOINT_MAX_ITEMS_PER_KIND) {
		return apiError.badRequest("tooManyOutcomes");
	}

	const now = new Date();
	const firstNewOrder =
		outcomes.reduce((max, item) => Math.max(max, item.order), 0) + 1;

	try {
		await prisma.$transaction(async (tx) => {
			// The stamp goes first and only onto a checkpoint still unrevised: two
			// submissions racing each other would otherwise both pass the read above
			// and write their added lines twice.
			const claimed = await tx.projectCheckpoint.updateMany({
				where: { id, revisedAt: null },
				data: { revisedAt: now, revisedNote: note },
			});

			if (claimed.count === 0) throw new Error("checkpointAlreadyRevised");

			for (const { item, change } of updates) {
				await tx.checkpointItem.update({
					where: { id: item.id },
					data: {
						...(change.cut !== undefined && { cut: change.cut }),
						...(change.text !== undefined && {
							text: change.text,
							// Written once: a second rewording must not erase day 1.
							...(item.originalText === null && { originalText: item.text }),
						}),
					},
				});
			}

			if (added.length > 0) {
				await tx.checkpointItem.createMany({
					data: added.map((line, index) => ({
						checkpointId: id,
						kind: CheckpointItemKind.Outcome,
						order: firstNewOrder + index,
						text: line.text,
						addedAt: now,
					})),
				});
			}
		});
	} catch (error) {
		if (
			error instanceof Error &&
			error.message === "checkpointAlreadyRevised"
		) {
			return apiError.badRequest("checkpointAlreadyRevised");
		}

		throw error;
	}

	return json(withProgress(await getCheckpoint(id)));
});
