import {
	currentSprint,
	SPRINTS_PER_CHECKPOINT,
	sprintOfDate,
	sprintRange,
} from "@/lib/checkpoint-sprints";

/** A count and what it is counted against — the band draws both. */
export type SignalCount = { done: number; total: number };

export type CheckpointSignals = {
	/** One devlog per sprint, so the total is always the four sprints. */
	devlogs: SignalCount;
	/** Only the sprint under way: a pulse is asked once per person per sprint. */
	pulses: SignalCount;
	/** Outcomes with something attached against them, cut ones excluded. */
	evidence: SignalCount;
};

export type SignalsInput = {
	startedAt: Date | null;
	reports: { publishedAt: Date }[];
	pulses: { week: number; confirmedAt: Date | null }[];
	members: { startedAt: Date; finishedAt: Date | null }[];
	outcomes: { cut: boolean; hasArtifact: boolean }[];
};

/**
 * The three numbers the card shows under the day counter — frame `qfMkz`.
 *
 * Nothing here is stored: a devlog knows when it was published and a pulse knows
 * which sprint it answered, so the counts are read off the same rows the page
 * already has. A checkpoint that has not started has no sprints to count in,
 * which is why a draft gets no band at all.
 */
export const checkpointSignals = (
	input: SignalsInput,
	at: Date = new Date(),
): CheckpointSignals | null => {
	const { startedAt } = input;
	if (!startedAt) return null;

	const written = new Set(
		input.reports
			.map((report) => sprintOfDate(startedAt, report.publishedAt))
			.filter((sprint): sprint is number => sprint !== null),
	);

	const sprint = currentSprint(startedAt, at);
	const { from, to } = sprintRange(startedAt, sprint);

	// Someone who joined after the sprint ended, or left before it began, was
	// never asked — counting them would read as a team that stopped answering.
	const asked = input.members.filter(
		(member) =>
			member.startedAt <= to &&
			(!member.finishedAt || member.finishedAt >= from),
	).length;

	const live = input.outcomes.filter((outcome) => !outcome.cut);

	return {
		devlogs: { done: written.size, total: SPRINTS_PER_CHECKPOINT },
		pulses: {
			done: input.pulses.filter(
				(pulse) => pulse.week === sprint && pulse.confirmedAt,
			).length,
			total: asked,
		},
		evidence: {
			done: live.filter((outcome) => outcome.hasArtifact).length,
			total: live.length,
		},
	};
};
