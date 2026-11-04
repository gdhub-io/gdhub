/**
 * The project's activity as the AI curator reads it: one line per event, and
 * the sentence around them. Production and the lab both write it from here, so
 * the curator is never tested on wording it does not get.
 */

export const ACTIVITY_LINE = {
	artifact: (actor: string, subject: string) => `${actor} added "${subject}"`,
	joined: (actor: string, subject: string) => `${actor} joined as ${subject}`,
	left: (actor: string, subject: string) => `${actor} (${subject}) left`,
	vacancyOpened: (_: string, subject: string) => `an open position: ${subject}`,
	vacancyClosed: (_: string, subject: string) =>
		`the open position closed: ${subject}`,
} as const;

export type ActivityKind = keyof typeof ACTIVITY_LINE;

/** `- 2026-11-07 · Ana added "Jump test"`, for a UTC day already formatted. */
export const activityLine = (
	day: string,
	kind: ActivityKind,
	actor: string,
	subject: string,
) => `- ${day} · ${ACTIVITY_LINE[kind](actor, subject)}`;

/** The lines of a period in one text; the lead-in says it is before the checkpoint. */
export const activityText = (
	lines: string[],
	from: string,
	to: string,
	leadIn: boolean,
	more = "",
) => {
	const period = leadIn
		? `in the two weeks before the checkpoint started, from ${from} to ${to}`
		: `from ${from} to ${to}`;
	return lines.length
		? `What happened on the project ${period}:\n${lines.join("\n")}${more}`
		: `Nothing else happened on the project ${period}.`;
};
