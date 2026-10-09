import {
	ArtifactCheckStatus,
	CheckpointItemKind,
	CheckpointVerdict,
} from "@/config/prisma-enums";

/**
 * What "delivered" means, decided in code rather than by whoever wrote the
 * verdict (§9).
 *
 * The AI curator proposes a verdict and this settles it. Both directions are
 * closed: an outcome that was not cut and carries no readable artifact cannot
 * produce `StageClosed` or `GoalMet`, and a checkpoint where every remaining
 * outcome is proven cannot come back `GoalMissed`. The model has no way to waive
 * either, and a human curator reaches the same function through `acceptedNote`.
 */

/** Why an outcome is not proven. The report tells the author which it was. */
export type UnprovenReason =
	| "missing"
	| "unreachable"
	| "unsupported"
	| "pending";

export type VerdictItem = {
	id: string;
	kind: CheckpointItemKind;
	text: string;
	cut: boolean;
	/** A human curator counting an outcome no artifact covers. */
	acceptedNote?: string | null;
	artifact?: { checkStatus: ArtifactCheckStatus | null } | null;
};

export type UnprovenOutcome = {
	id: string;
	text: string;
	reason: UnprovenReason;
};

/**
 * An artifact nobody can open is not evidence, but "we could not open your
 * build" and "you attached nothing" are different things to tell an author who
 * paid, so the reason travels with the answer.
 */
const unprovenReason = (item: VerdictItem): UnprovenReason | null => {
	if (item.acceptedNote?.trim()) return null;
	if (!item.artifact) return "missing";

	switch (item.artifact.checkStatus) {
		case ArtifactCheckStatus.Readable:
			return null;
		case ArtifactCheckStatus.Unreachable:
			return "unreachable";
		case ArtifactCheckStatus.Unsupported:
			return "unsupported";
		default:
			// Null is an artifact the checker has not reached yet, which is the
			// same thing to a verdict as one that failed: nothing has confirmed it.
			return "pending";
	}
};

/** Counted as delivered: a readable artifact, or the curator's own note. */
export const isProven = (item: VerdictItem) => unprovenReason(item) === null;

/** The outcomes still owed, in goal-card order. Cut lines are never owed. */
export const unprovenOutcomes = (items: VerdictItem[]): UnprovenOutcome[] =>
	items
		.filter((item) => item.kind === CheckpointItemKind.Outcome && !item.cut)
		.flatMap((item) => {
			const reason = unprovenReason(item);

			return reason ? [{ id: item.id, text: item.text, reason }] : [];
		});

export type SettledVerdict = {
	verdict: CheckpointVerdict;
	/** Set when the guardrail overrode what the curator proposed. */
	overrode: CheckpointVerdict | null;
	unproven: UnprovenOutcome[];
};

/**
 * The verdict that is actually written, given what the curator proposed.
 *
 * `StageClosed` is the only value the guardrail cannot grant on its own: whether
 * the stage's own requirements are met is a judgement, and forcing it up from
 * `GoalMet` would close a stage nobody said was finished. It only ever refuses.
 */
export const settleVerdict = (
	items: VerdictItem[],
	proposed: CheckpointVerdict,
): SettledVerdict => {
	const unproven = unprovenOutcomes(items);

	if (unproven.length > 0) {
		return {
			verdict: CheckpointVerdict.GoalMissed,
			overrode: proposed === CheckpointVerdict.GoalMissed ? null : proposed,
			unproven,
		};
	}

	if (proposed === CheckpointVerdict.GoalMissed) {
		return {
			verdict: CheckpointVerdict.GoalMet,
			overrode: proposed,
			unproven,
		};
	}

	return { verdict: proposed, overrode: null, unproven };
};
