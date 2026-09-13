import { dayNumberOn } from "@/lib/checkpoint-days";
import type { CheckpointDto } from "@/types/checkpoints";

/**
 * The thread, built from the checkpoint itself (frames `HyaoU`, `qXEDm`).
 *
 * There is no table of thread entries and there should not be: every line here
 * is a timestamp the record already carries, and a second copy of the same
 * events would be one more thing that can disagree with the checkpoint.
 *
 * Pure so it can be tested without a page — the ordering and the day numbers are
 * the part that can be quietly wrong.
 */

export type ThreadEntryKind =
	| "started"
	| "goalAgreed"
	| "devlog"
	| "scopeNote"
	| "revised"
	| "verdict";

export type ThreadEntry = {
	key: string;
	kind: ThreadEntryKind;
	at: string;
	day: number | null;
	/** Only a devlog brings its own title; the rest are named by their kind. */
	title?: string;
	body?: string | null;
	/** A devlog's answer from the curator, written the day after the post. */
	answer?: { text: string; at: string | null } | null;
};

/** The first line of a devlog stands in for its title, as the frames show it. */
const devlogTitle = (content: string) => {
	const line = content
		.split("\n")
		.map((part) => part.replace(/^#+\s*/, "").trim())
		.find(Boolean);

	return line ? (line.length > 90 ? `${line.slice(0, 89)}…` : line) : "";
};

export const buildThread = (checkpoint: CheckpointDto): ThreadEntry[] => {
	const started = checkpoint.startedAt ? new Date(checkpoint.startedAt) : null;
	const dayOf = (at: string) =>
		started ? dayNumberOn(started, new Date(at)) : null;

	const entries: ThreadEntry[] = [];

	if (checkpoint.startedAt) {
		entries.push({
			key: "started",
			kind: "started",
			at: checkpoint.startedAt,
			day: 1,
		});
	}

	if (checkpoint.goalAgreedAt) {
		entries.push({
			key: "goalAgreed",
			kind: "goalAgreed",
			at: checkpoint.goalAgreedAt,
			day: dayOf(checkpoint.goalAgreedAt),
		});
	}

	for (const report of checkpoint.reports ?? []) {
		entries.push({
			key: report.id,
			kind: "devlog",
			at: report.publishedAt,
			day: dayOf(report.publishedAt),
			title: devlogTitle(report.content),
			body: report.content,
			answer: report.curatorFeedback
				? { text: report.curatorFeedback, at: report.curatorFeedbackAt }
				: null,
		});
	}

	// The note has no timestamp of its own: it is written on day 14 and nowhere
	// else, so the revision date is the only thing that could move it, and a
	// revision is its own entry.
	if (checkpoint.midNote && started) {
		const at = new Date(started);
		at.setUTCDate(at.getUTCDate() + 13);

		entries.push({
			key: "scopeNote",
			kind: "scopeNote",
			at: at.toISOString(),
			day: 14,
			body: checkpoint.midNote,
		});
	}

	if (checkpoint.revisedAt) {
		entries.push({
			key: "revised",
			kind: "revised",
			at: checkpoint.revisedAt,
			day: dayOf(checkpoint.revisedAt),
			body: checkpoint.revisedNote,
		});
	}

	if (checkpoint.verdict && checkpoint.decidedAt) {
		entries.push({
			key: "verdict",
			kind: "verdict",
			at: checkpoint.decidedAt,
			day: dayOf(checkpoint.decidedAt),
			body: checkpoint.verdictNote,
		});
	}

	return entries.sort(
		(a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
	);
};
