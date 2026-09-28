import {
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointStatus,
} from "@gdhub-io/gdhub-prisma";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { dueDateFrom } from "@/lib/checkpoint-days";
import { withSpaceGuard } from "@/lib/space-guard";
import { projectOfCheckpoint } from "@/lib/space-ids";
import {
	getCheckpoint,
	replaceCheckpointItems,
	withProgress,
} from "@/repositories/checkpoint.repository";
import {
	isCheckpointPaid,
	pendingCheckout,
	reconcileCheckout,
} from "@/repositories/checkpoint-payment";
import {
	type UpdateCheckpointBody,
	UpdateCheckpointSchema,
} from "@/schemas/checkpoint";
import { prisma } from "@/services/prisma";

/**
 * The space is resolved from the checkpoint itself, so a checkpoint id from one
 * project cannot be paired with a project id from another.
 */

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.checkpoints.view",
		idFrom: projectOfCheckpoint,
	}),
)(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	let checkpoint = await getCheckpoint(id);

	if (!checkpoint) return apiError.notFound();

	// A draft may have been paid for without the webhook ever arriving; Stripe
	// is asked directly before the page tells its author to pay again.
	if (checkpoint.status === CheckpointStatus.Draft) {
		const pending = await pendingCheckout(id);

		if (pending && (await reconcileCheckout(pending).catch(() => false))) {
			checkpoint = (await getCheckpoint(id)) ?? checkpoint;
		}
	}

	return json(withProgress(checkpoint));
});

/**
 * A step of the start flow, saved as it is left. Only a `Draft` accepts it: once
 * the 28 days are running the goal card is what the verdict is judged against,
 * and the only way it moves after that is the day-14 scope change.
 */
export const PUT = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.checkpoints.manage",
		idFrom: projectOfCheckpoint,
	}),
	withValidation(UpdateCheckpointSchema),
)(async (_req, ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const {
		goal,
		curatorKind,
		curatorId,
		acceptedTerms,
		inputs,
		outcomes,
		startedAt,
	} = body as UpdateCheckpointBody;

	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id },
		select: { status: true },
	});

	if (!checkpoint) return apiError.notFound();

	// A draft is the author's to rewrite. A checkpoint that is paid for and
	// waiting is not — except for who runs it: a curator can decline, or sit on
	// it, and naming somebody else is the only way out that does not cost the
	// author their money.
	const onlyTheCurator =
		curatorId !== undefined &&
		goal === undefined &&
		acceptedTerms === undefined &&
		startedAt === undefined &&
		!inputs &&
		!outcomes;

	const mayEdit =
		checkpoint.status === CheckpointStatus.Draft ||
		(checkpoint.status === CheckpointStatus.AwaitingCurator && onlyTheCurator);

	if (!mayEdit) return apiError.badRequest("checkpointNotDraft");

	// A checkpoint is given to someone who said they take mentees; the switch is
	// theirs to flip, so it is read here rather than trusted from the browser.
	if (curatorId) {
		const open = await prisma.speciality.findFirst({
			where: { userId: curatorId, isOpenForMentoring: true },
			select: { id: true },
		});

		if (!open) return apiError.badRequest("curatorNotOpenForMentoring");
	}

	// A curator who declined leaves a paid checkpoint back in Draft. Naming
	// someone else sends it to them rather than asking the author to pay again.
	const rehomed =
		(curatorId !== undefined || curatorKind) && (await isCheckpointPaid(id))
			? curatorKind === CheckpointCuratorKind.AI
				? CheckpointStatus.Active
				: CheckpointStatus.AwaitingCurator
			: null;

	if (
		goal !== undefined ||
		curatorKind ||
		curatorId !== undefined ||
		acceptedTerms !== undefined ||
		startedAt !== undefined
	) {
		await prisma.projectCheckpoint.update({
			where: { id },
			data: {
				...(rehomed && { status: rehomed }),
				...(goal !== undefined && { goal }),
				...(curatorKind && { curatorKind }),
				...(curatorId !== undefined && { curatorId }),
				// The moment it was accepted is the record; unticking withdraws it.
				...(acceptedTerms !== undefined && {
					acceptedTermsAt: acceptedTerms ? new Date() : null,
				}),
				// The day the author picked. `dueAt` follows from it rather than
				// being sent, so the two can never disagree by a day.
				...(startedAt !== undefined && {
					startedAt,
					dueAt: startedAt ? dueDateFrom(startedAt) : null,
				}),
			},
		});
	}

	if (inputs) {
		await replaceCheckpointItems(id, CheckpointItemKind.Input, inputs);
	}

	if (outcomes) {
		await replaceCheckpointItems(id, CheckpointItemKind.Outcome, outcomes);
	}

	return json(withProgress(await getCheckpoint(id)));
});

/**
 * Throws the draft away. Only a `Draft` — a checkpoint that has been paid for
 * goes to a verdict, because a deadline you can call off is not a deadline.
 */
export const DELETE = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.checkpoints.manage",
		idFrom: projectOfCheckpoint,
	}),
)(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };

	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id },
		select: { status: true },
	});

	if (!checkpoint) return apiError.notFound();
	if (checkpoint.status !== CheckpointStatus.Draft) {
		return apiError.badRequest("checkpointNotDraft");
	}

	await prisma.projectCheckpoint.delete({ where: { id } });

	return json({ success: true });
});
