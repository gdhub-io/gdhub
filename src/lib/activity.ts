/** The dated rows one kind of activity yields: whose it is and when it happened. */
export type ActivityRows = { id: string; at: Date | null }[];

/**
 * What counts as activity for one kind of subject (a project today, a user
 * later): every kind of event with how to find its dates for many subjects at
 * once. A kind left out of a spec is, by definition, not activity.
 */
export type ActivitySpec<Kind extends string> = Record<
	Kind,
	(ids: string[]) => Promise<ActivityRows>
>;

/** The latest of the dates given, ignoring the missing ones. */
export const latestOf = (...dates: (Date | null | undefined)[]) =>
	dates.reduce<Date | null>(
		(latest, date) => (date && (!latest || date > latest) ? date : latest),
		null,
	);

/** The latest event of any kind in `spec` for each subject; one with none is absent. */
export async function lastActivity<Kind extends string>(
	spec: ActivitySpec<Kind>,
	ids: string[],
): Promise<Map<string, Date>> {
	const latest = new Map<string, Date>();
	if (ids.length === 0) return latest;

	const sources = Object.values(spec) as ActivitySpec<Kind>[Kind][];
	for (const rows of await Promise.all(sources.map((rowsOf) => rowsOf(ids)))) {
		for (const { id, at } of rows) {
			const next = latestOf(latest.get(id), at);
			if (next) latest.set(id, next);
		}
	}
	return latest;
}
