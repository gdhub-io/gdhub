import { CHECKPOINT_DAYS } from "@/schemas/checkpoint";
import {
	devlogDayOf,
	SPRINTS_PER_CHECKPOINT,
	sprintDayRange,
} from "./checkpoint-sprints";

/** The written verdict is due two days after the last call. */
export const VERDICT_DAY = CHECKPOINT_DAYS + 2;

export type CheckpointPlanStep =
	/** `call` 1–4 opens its sprint; call 5 decides the checkpoint. */
	| { kind: "call"; call: number; day: number; sprint: number | null }
	| { kind: "devlog"; day: number; sprint: number }
	| { kind: "verdict"; day: number };

/**
 * The curator's calendar from `docs/checkpoint-standard.md` §3, in day order:
 * a call opens each sprint, a devlog closes it, a fifth call decides it and the
 * verdict is written by day 30. Days, not dates — the dates follow from the
 * start, and a checkpoint not yet started still has a plan.
 */
export const checkpointPlan = (): CheckpointPlanStep[] => {
	const steps: CheckpointPlanStep[] = [];

	for (let sprint = 1; sprint <= SPRINTS_PER_CHECKPOINT; sprint++) {
		steps.push(
			{
				kind: "call",
				call: sprint,
				day: sprintDayRange(sprint).firstDay,
				sprint,
			},
			{ kind: "devlog", day: devlogDayOf(sprint), sprint },
		);
	}

	steps.push(
		{
			kind: "call",
			call: SPRINTS_PER_CHECKPOINT + 1,
			day: CHECKPOINT_DAYS,
			sprint: null,
		},
		{ kind: "verdict", day: VERDICT_DAY },
	);

	return steps;
};

/** The calendar date of a checkpoint day, at UTC midnight. */
export const dateOfDay = (startedAt: Date | string, day: number) => {
	const date = new Date(startedAt);
	date.setUTCHours(0, 0, 0, 0);
	date.setUTCDate(date.getUTCDate() + day - 1);

	return date;
};
