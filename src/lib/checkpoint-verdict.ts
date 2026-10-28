import {
	ArtifactCheckStatus,
	CheckpointItemKind,
	CheckpointVerdict,
	EvidenceMatch,
} from "@/config/prisma-enums";
import type { OpenFailure } from "@/services/artifact-check/safe-fetch";

/**
 * What "delivered" means, decided in code rather than by whoever wrote the
 * verdict (§9).
 *
 * The AI curator is a cautious optimist (GDHUB-81). Evidence attached is the
 * first level of trust; what the AI made of it is the second. An outcome it
 * could read is judged against its task; one it could not read is taken on
 * trust, and the verdict says so. A link that leads nowhere and evidence that
 * shows something else are not delivered. The model proposes a verdict and
 * this settles it; it has no way to waive either direction.
 *
 * A human curator judges evidence himself: `isProven` keeps the plain rule —
 * a readable artifact, or the curator's own note.
 */

/** Why an outcome is not delivered. The verdict tells the author which it was. */
export type UnprovenReason = "missing" | "broken" | "doesNotMatch";

/** Why the AI could not see what an artifact holds, and so took it on trust. */
export type TrustReason = "needsLogin" | "unreadable" | "notChecked";

export type VerdictItem = {
	id: string;
	kind: CheckpointItemKind;
	text: string;
	cut: boolean;
	/** A human curator counting an outcome no artifact covers. */
	acceptedNote?: string | null;
	/** Every artifact offered for it (GDHUB-115), with what the AI saw in each. */
	evidence: VerdictEvidence[];
};

export type VerdictEvidence = {
	match?: EvidenceMatch | null;
	matchNote?: string | null;
	artifact: {
		checkStatus: ArtifactCheckStatus | null;
		checkNote?: string | null;
	};
};

export type UnprovenOutcome = {
	id: string;
	text: string;
	reason: UnprovenReason;
};
export type TrustedOutcome = { id: string; text: string; reason: TrustReason };
export type PartlyOutcome = { id: string; text: string; note: string | null };

export type Standing =
	| { is: "delivered" }
	| { is: "partly"; note: string | null }
	| { is: "trusted"; reason: TrustReason }
	| { is: "unproven"; reason: UnprovenReason };

const NEEDS_LOGIN: OpenFailure = "needsLogin";

/** How the AI curator counts one artifact offered for an outcome. */
export const standingOfPiece = ({
	artifact,
	match,
	matchNote,
}: VerdictEvidence): Standing => {
	switch (artifact.checkStatus) {
		case ArtifactCheckStatus.Unreachable:
			// Behind a login the work may well be there; a dead link shows nothing.
			return artifact.checkNote === NEEDS_LOGIN
				? { is: "trusted", reason: "needsLogin" }
				: { is: "unproven", reason: "broken" };
		case ArtifactCheckStatus.Unsupported:
			return { is: "trusted", reason: "unreadable" };
		case ArtifactCheckStatus.Readable:
			break;
		default:
			return { is: "trusted", reason: "notChecked" };
	}

	switch (match) {
		case EvidenceMatch.Matches:
			return { is: "delivered" };
		case EvidenceMatch.Partly:
			return { is: "partly", note: matchNote ?? null };
		case EvidenceMatch.DoesNotMatch:
			return { is: "unproven", reason: "doesNotMatch" };
		default:
			// Opened, but the AI could not tell what it shows.
			return { is: "trusted", reason: "unreadable" };
	}
};

/** Best first: one artifact that shows the task is enough (GDHUB-115). */
const RANK = (standing: Standing) =>
	({ delivered: 0, partly: 1, trusted: 2, unproven: 3 })[standing.is] +
	// Of two that fail, "shows something else" says more than "does not open".
	(standing.is === "unproven" && standing.reason === "broken" ? 0.5 : 0);

/**
 * How the AI curator counts one outcome: by the best of its artifacts. One that
 * does not open, or shows something else, does not undo another that shows it.
 */
export const standingOf = (item: VerdictItem): Standing => {
	if (item.acceptedNote?.trim()) return { is: "delivered" };
	const pieces = item.evidence.map(standingOfPiece);
	if (!pieces.length) return { is: "unproven", reason: "missing" };
	return pieces.reduce((best, next) => (RANK(next) < RANK(best) ? next : best));
};

/** Counted as delivered by a human curator: a readable artifact, or their own note. */
export const isProven = (item: VerdictItem) =>
	!!item.acceptedNote?.trim() ||
	item.evidence.some(
		(piece) => piece.artifact.checkStatus === ArtifactCheckStatus.Readable,
	);

export type WeighedOutcomes = {
	unproven: UnprovenOutcome[];
	trusted: TrustedOutcome[];
	partly: PartlyOutcome[];
};

/** The AI curator's reading of every outcome still owed, in goal-card order. Cut lines are never owed. */
export const weighOutcomes = (items: VerdictItem[]): WeighedOutcomes => {
	const weighed: WeighedOutcomes = { unproven: [], trusted: [], partly: [] };

	for (const item of items) {
		if (item.kind !== CheckpointItemKind.Outcome || item.cut) continue;
		const standing = standingOf(item);
		const { id, text } = item;

		if (standing.is === "unproven") {
			weighed.unproven.push({ id, text, reason: standing.reason });
		} else if (standing.is === "trusted") {
			weighed.trusted.push({ id, text, reason: standing.reason });
		} else if (standing.is === "partly") {
			weighed.partly.push({ id, text, note: standing.note });
		}
	}

	return weighed;
};

export type SettledVerdict = WeighedOutcomes & {
	verdict: CheckpointVerdict;
	/** Set when the guardrail overrode what the curator proposed. */
	overrode: CheckpointVerdict | null;
};

/**
 * The verdict that is actually written, given what the curator proposed.
 *
 * The guardrail only ever refuses: a task not delivered keeps the goal missed,
 * whatever was proposed. It never lifts one — every task proven is the plan
 * done, not the goal reached, and whether the goal is shown inside its stage
 * is the curator's judgement (GDHUB-122).
 */
export const settleVerdict = (
	items: VerdictItem[],
	proposed: CheckpointVerdict,
): SettledVerdict => {
	const weighed = weighOutcomes(items);
	const verdict =
		weighed.unproven.length > 0 ? CheckpointVerdict.GoalMissed : proposed;

	return {
		...weighed,
		verdict,
		overrode: verdict === proposed ? null : proposed,
	};
};
