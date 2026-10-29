import {
	AI_WRITES_AT_HOUR,
	EVIDENCE_REMIND_DAY,
	SCOPE_ANSWER_HOURS,
	SCOPE_SESSION,
	SESSION_MINUTES,
} from "@/config/checkpoint";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import { MS_PER_HOUR, MS_PER_MINUTE, sessionDay } from "@/lib/checkpoint-days";
import { checkpointPlan, dateOfDay } from "@/lib/checkpoint-plan";
import { scopeWindow } from "@/lib/checkpoint-scope";

/**
 * Every date of a checkpoint (GDHUB-124), for its Calendar tab, the
 * subscription and the .ics download: one list, built from the start day, the
 * calls as booked and the checkpoint's own rules. Browser-safe.
 */

export type CalendarKind =
	| "call"
	| "plan"
	| "review"
	| "brief"
	| "deadline"
	| "change"
	| "evidence"
	| "verdict";

export type CheckpointCalendarEvent = {
	/** Stable across fetches, so a subscribed calendar moves an event rather than adding one. */
	uid: string;
	kind: CalendarKind;
	/** The call, review or sprint it belongs to. */
	index: number | null;
	start: Date;
	/** Timed events only; a deadline is a whole day. */
	minutes?: number;
	allDay?: boolean;
};

export type CalendarViewer = "curator" | "team";

export const checkpointCalendar = (
	checkpoint: {
		id: string;
		startedAt: Date;
		curatorKind: CheckpointCuratorKind | null;
		sessions: { index: number; scheduledAt: Date; endedAt: Date | null }[];
	},
	viewer: CalendarViewer,
): CheckpointCalendarEvent[] => {
	const { id, startedAt, sessions } = checkpoint;
	const isAI = checkpoint.curatorKind === CheckpointCuratorKind.AI;
	const uid = (what: string) => `checkpoint-${id}-${what}@gdhub.io`;
	const day = (n: number) => dateOfDay(startedAt, n);
	const aiHour = (n: number) =>
		new Date(day(n).getTime() + AI_WRITES_AT_HOUR * MS_PER_HOUR);
	const events: CheckpointCalendarEvent[] = [];

	for (const step of checkpointPlan()) {
		if (step.kind === "devlog") {
			events.push({
				uid: uid(`deadline-${step.sprint}`),
				kind: "deadline",
				index: step.sprint,
				start: day(step.day),
				allDay: true,
			});
		} else if (step.kind === "call") {
			const session = sessions.find((row) => row.index === step.call);
			if (isAI) {
				events.push({
					uid: uid(`session-${step.call}`),
					kind: step.call === 1 ? "plan" : "review",
					index: step.call,
					...(step.call === 1
						? { start: day(step.day), allDay: true }
						: { start: aiHour(step.day), minutes: 15 }),
				});
				continue;
			}
			events.push({
				uid: uid(`session-${step.call}`),
				kind: "call",
				index: step.call,
				start: session?.scheduledAt ?? day(step.day),
				minutes: SESSION_MINUTES,
				allDay: !session,
			});
			// The AI's read of the sprint behind, for the curator alone, the night before.
			if (viewer === "curator" && step.call > 1) {
				events.push({
					uid: uid(`brief-${step.call}`),
					kind: "brief",
					index: step.call - 1,
					start: aiHour(step.day),
					minutes: 15,
				});
			}
		} else if (!isAI) {
			// With the AI the verdict comes with the final review.
			events.push({
				uid: uid("verdict"),
				kind: "verdict",
				index: null,
				start: day(step.day),
				allDay: true,
			});
		}
	}

	// With the AI the change opens once review 2 is written; until then, the hour it usually is.
	const third = sessions.find((row) => row.index === SCOPE_SESSION);
	const { opens, closes } = isAI
		? (() => {
				const written = third?.endedAt ?? aiHour(sessionDay(SCOPE_SESSION));
				return {
					opens: written,
					closes: new Date(
						written.getTime() + SCOPE_ANSWER_HOURS * MS_PER_HOUR,
					),
				};
			})()
		: scopeWindow(startedAt, sessions);
	events.push(
		{
			uid: uid("change"),
			kind: "change",
			index: SCOPE_SESSION,
			start: opens,
			minutes: Math.round((closes.getTime() - opens.getTime()) / MS_PER_MINUTE),
		},
		{
			uid: uid("evidence"),
			kind: "evidence",
			index: null,
			start: day(EVIDENCE_REMIND_DAY),
			allDay: true,
		},
	);

	return events.sort((a, b) => a.start.getTime() - b.start.getTime());
};
