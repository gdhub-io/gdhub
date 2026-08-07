/**
 * Steps and tasks are matched between a project and its template by name — the
 * template's copies carry no shared id — so every comparison in this area hangs
 * on the same question: are these two the same thing?
 *
 * One answer, in one place. A rename back to what it was, typed differently, is
 * not a change; and a drift check, a reset plan and a difference list that
 * disagreed about that would each be right about a different workflow.
 */
export const matchKey = (value: string | null | undefined) =>
	(value ?? "").trim().toLowerCase();
