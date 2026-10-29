import {
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointStatus,
} from "@gdhub-io/gdhub-prisma";
import { EXPERT_CHECKPOINT_OPEN } from "@/config/checkpoint";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { dueDateFrom, utcStartOfDay } from "@/lib/checkpoints/days";
import { checkpointMove } from "@/lib/checkpoints/status";
import { withSpaceGuard } from "@/lib/space-guard";
import { projectOfCheckpoint } from "@/lib/space-ids";
import {
	isFirstCallFree,
	SlotTakenError,
} from "@/repositories/advisor-availability";
import {
	checkpointDraftState,
	checkpointStatusOf,
	deleteCheckpoint,
	replaceCheckpointItems,
	updateCheckpointDraft,
	updateCheckpointDraftAndBook,
	withProgress,
} from "@/repositories/checkpoints/checkpoint";
import { isEligibleCurator } from "@/repositories/checkpoints/curator-catalog";
import { getCheckpoint } from "@/repositories/checkpoints/detail";
import {
	completedPaymentOf,
	curatorCharge,
	heldAmount,
	pendingCheckout,
} from "@/repositories/checkpoints/payment";
import { checkpointViewer } from "@/repositories/checkpoints/viewer";
import {
	type UpdateCheckpointBody,
	UpdateCheckpointSchema,
} from "@/schemas/checkpoint";
import {
	reconcileCheckout,
	startAiCheckpoint,
} from "@/services/checkpoints/flows/payment";

/** The checkpoint as its page reads it; a draft paid for without the webhook is settled first. */
const readCheckpoint = async (id: string) => {
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
};

/**
 * The space is resolved from the checkpoint itself, so a checkpoint id from one
 * project cannot be paired with a project id from another.
 */
const readInSpace = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.checkpoints.view",
		idFrom: projectOfCheckpoint,
	}),
)(async (_req, ctx) => {
	const { id } = (await ctx.params) as { id: string };
	return readCheckpoint(id);
});

/**
 * Its curator, author and team read it as the checkpoint's own; anyone else —
 * a hub admin, a custom role — through the project's space.
 */
export const GET = withAuth({ mode: "user" })(async (req, ctx, locals) => {
	const user = locals.user as SessionUser | undefined;
	if (!user) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	return (await checkpointViewer(id, user.id))
		? readCheckpoint(id)
		: readInSpace(req, ctx, locals);
});

/**
 * A step of the start flow, saved as it is left. Only a `Draft` accepts it: once
 * the 28 days are running the goal card is what the verdict is judged against,
 * and the only way it moves after that is the day-15 scope change.
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
	const { goal, curatorKind, curatorId, inputs, outcomes, startedAt } =
		body as UpdateCheckpointBody;

	const checkpoint = await checkpointDraftState(id);

	if (!checkpoint) return apiError.notFound();

	const kind = curatorKind ?? checkpoint.curatorKind;
	const curator = curatorId === undefined ? checkpoint.curatorId : curatorId;
	const human = kind === CheckpointCuratorKind.Human;

	// A draft is the author's to rewrite. A checkpoint that is paid for and
	// waiting is not — except for who runs it and when they first meet: a
	// curator can decline, or sit on it, and naming somebody else is the only
	// way out that does not cost the author their money.
	// The first call comes with them: it is booked in that curator's hours.
	const onlyTheCurator =
		curatorId !== undefined && goal === undefined && !inputs && !outcomes;

	const mayEdit =
		checkpoint.status === CheckpointStatus.Draft ||
		(checkpoint.status === CheckpointStatus.AwaitingCurator && onlyTheCurator);

	if (!mayEdit) return apiError.badRequest("checkpointNotDraft");

	// Every read the checks below need, at once; they are still judged in order.
	const choosing = curatorId !== undefined || !!curatorKind;
	const [paidWith, held, eligible, firstCallFree] = await Promise.all([
		choosing ? completedPaymentOf(id) : null,
		choosing ? heldAmount(id) : null,
		curatorId && curatorId !== currentUser.id
			? isEligibleCurator(curatorId, checkpoint.stageName)
			: true,
		human && startedAt && curator
			? isFirstCallFree(curator, startedAt, id)
			: true,
	]);

	// An expert is a waitlist until it opens. A paid draft a curator handed
	// back keeps its expert path, so the author is not made to pay again.
	if (
		!EXPERT_CHECKPOINT_OPEN &&
		curatorKind === CheckpointCuratorKind.Human &&
		!paidWith
	) {
		return apiError.badRequest("expertClosed");
	}

	// The same rule the curator list shows, read here rather than trusted from
	// the browser: open to mentees, Experienced or Expert, and never the author —
	// the point of the 28 days is judgement from outside.
	if (curatorId) {
		if (curatorId === currentUser.id) {
			return apiError.badRequest("curatorIsAuthor");
		}

		if (!eligible) return apiError.badRequest("curatorNotOpenForMentoring");
	}

	// Money already held buys exactly one price: a dearer curator would need a
	// top-up and a cheaper one a partial refund, and neither exists yet.
	if (choosing) {
		const charge =
			held === null
				? null
				: await curatorCharge(
						curatorKind ?? checkpoint.curatorKind,
						curatorId === undefined ? checkpoint.curatorId : curatorId,
						checkpoint.stageName,
					);

		if (held !== null && charge !== held) {
			return apiError.badRequest("curatorPriceDiffers");
		}
	}

	// With a person the start is their first call, so it must still open a free
	// series of five with them; the hour belongs to that curator alone.
	if (human && startedAt) {
		if (!curator || !firstCallFree) {
			return apiError.badRequest("slotTaken");
		}
	}
	const curatorChanged =
		curatorId !== undefined && curatorId !== checkpoint.curatorId;
	const start =
		startedAt !== undefined
			? startedAt
			: human && curatorChanged
				? null
				: undefined;

	// A curator who declined leaves a paid checkpoint back in Draft. Naming
	// someone else sends it to them rather than asking the author to pay again;
	// naming the AI starts it, exactly as paying for the AI does.
	const rehomedToAi = !!paidWith && curatorKind === CheckpointCuratorKind.AI;
	const rehomedToHuman = !!paidWith && !rehomedToAi;
	const move =
		rehomedToHuman && checkpoint.status === CheckpointStatus.Draft
			? checkpointMove(CheckpointStatus.Draft, CheckpointStatus.AwaitingCurator)
			: null;

	if (
		goal !== undefined ||
		curatorKind ||
		curatorId !== undefined ||
		start !== undefined
	) {
		// Unmoved, it still has to be in the state it was read in: a curator's yes may land meanwhile.
		const where = { id, ...(move?.where ?? { status: checkpoint.status }) };
		const data = {
			...move?.data,
			...(goal !== undefined && { goal }),
			...(curatorKind && { curatorKind }),
			...(curatorId !== undefined && { curatorId }),
			// The first call with a person, the start of the day with the AI.
			// `dueAt` follows from it rather than being sent, so the two can
			// never disagree by a day.
			...(start !== undefined && {
				startedAt: start,
				dueAt: start ? dueDateFrom(utcStartOfDay(start)) : null,
			}),
		};

		// The money is held for this checkpoint — on a hold while it waits, or
		// taken already — so its calls are booked now, as a payment books them.
		const books =
			human &&
			(rehomedToHuman ||
				(checkpoint.status === CheckpointStatus.AwaitingCurator &&
					start !== undefined));

		let written = 0;
		if (books) {
			try {
				written = await updateCheckpointDraftAndBook(id, where, data);
			} catch (error) {
				if (error instanceof SlotTakenError)
					return apiError.badRequest("slotTaken");
				throw error;
			}
		} else {
			written = await updateCheckpointDraft(where, data);
		}
		if (!written) return apiError.badRequest("checkpointNotDraft");

		if (rehomedToAi && !(await startAiCheckpoint(id, paidWith))) {
			return apiError.badRequest("checkpointNotDraft");
		}
	}

	await Promise.all([
		inputs && replaceCheckpointItems(id, CheckpointItemKind.Input, inputs),
		outcomes &&
			replaceCheckpointItems(id, CheckpointItemKind.Outcome, outcomes),
	]);

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

	const checkpoint = await checkpointStatusOf(id);

	if (!checkpoint) return apiError.notFound();
	if (checkpoint.status !== CheckpointStatus.Draft) {
		return apiError.badRequest("checkpointNotDraft");
	}

	await deleteCheckpoint(id);

	return json({ success: true });
});
