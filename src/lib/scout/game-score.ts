/**
 * How strong a game looks next to the others in the same set, 0..100: the
 * blend `bun run top-games` ranks the LinkedIn post by. Each metric is
 * log-scaled against the best in the set, so one viral devlog cannot drown the
 * rest; the weights then say what a top game is.
 */
export const GAME_SCORE_WEIGHTS = { activity: 0.5, applause: 0.3, views: 0.2 };

export type GameScoreInputs = {
	/** `activityScore` of the project's devlogs and edits. */
	activity: number;
	applause: number;
	/** Project page views plus its devlogs' views. */
	views: number;
};

const scaled = (value: number, top: number) =>
	top > 0 ? Math.log1p(value) / Math.log1p(top) : 0;

/** One score per row, in the same order. */
export const gameScores = (rows: GameScoreInputs[]): number[] => {
	const max = {
		activity: Math.max(0, ...rows.map((r) => r.activity)),
		applause: Math.max(0, ...rows.map((r) => r.applause)),
		views: Math.max(0, ...rows.map((r) => r.views)),
	};
	return rows.map((row) =>
		Math.round(
			100 *
				(GAME_SCORE_WEIGHTS.activity * scaled(row.activity, max.activity) +
					GAME_SCORE_WEIGHTS.applause * scaled(row.applause, max.applause) +
					GAME_SCORE_WEIGHTS.views * scaled(row.views, max.views)),
		),
	);
};
