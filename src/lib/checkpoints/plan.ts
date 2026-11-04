import {
	CHECKPOINT_DAYS,
	FINAL_SESSION,
	SPRINTS_PER_CHECKPOINT,
	VERDICT_DUE_DAYS,
} from "@/config/checkpoint";
import { sessionDay } from "./days";
import { devlogDayOf, sprintDayRange } from "./sprints";

/** The day the written verdict is due by. */
export const VERDICT_DAY = CHECKPOINT_DAYS + VERDICT_DUE_DAYS;

export type CheckpointPlanStep =
	/** `call` 1–4 opens its sprint; call 5 decides the checkpoint. */
	| { kind: "call"; call: number; day: number; sprint: number | null }
	| { kind: "devlog"; day: number; sprint: number }
	| { kind: "verdict"; day: number };

/**
 * The curator's calendar from `docs/checkpoint-standard.md` §3, in day order:
 * a call opens each sprint, a devlog closes it, a fifth call decides it and the
 * verdict is written by `VERDICT_DAY`. Days, not dates — the dates follow from the
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
			call: FINAL_SESSION,
			day: CHECKPOINT_DAYS + 1,
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

/** The day of the first sprint review, as the plan letter names it: "Monday 9 November". */
export const reviewOnLabel = (startedAt: Date | string) =>
	dateOfDay(startedAt, sessionDay(2)).toLocaleDateString("en-GB", {
		weekday: "long",
		day: "numeric",
		month: "long",
		timeZone: "UTC",
	});

export type AuthorNextStep =
	| { kind: "devlog"; sprint: number; day: number; overdue: boolean }
	| { kind: "call"; call: number; day: number }
	| { kind: "verdict"; day: number };

/**
 * What the author has to do next, on the day given.
 *
 * A sprint's devlog is owed until the call that follows it — late, but still the
 * thing to do before that call — and drops away once published. Otherwise it is
 * the next call, and after the last call only the verdict is left, which is the
 * curator's move and the author's wait.
 */
export const authorNextStep = (
	day: number,
	written: ReadonlySet<number>,
): AuthorNextStep | null => {
	const plan = checkpointPlan();

	for (const [index, step] of plan.entries()) {
		if (step.kind === "devlog") {
			const callAfter = plan[index + 1]?.day ?? step.day;

			if (!written.has(step.sprint) && day <= callAfter) {
				return {
					kind: "devlog",
					sprint: step.sprint,
					day: step.day,
					overdue: day > step.day,
				};
			}
			continue;
		}

		if (step.day < day) continue;

		return step.kind === "call"
			? { kind: "call", call: step.call, day: step.day }
			: { kind: "verdict", day: step.day };
	}

	return null;
};
