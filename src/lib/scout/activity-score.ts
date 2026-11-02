export const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * The same weighting `prisma.project.getProjectsOrderedByActivity` uses: every
 * devlog post counts double, a post from the last month counts treble, and an
 * edit in the last month is worth half a point.
 *
 * Recomputed here rather than called, because that helper only looks at
 * Approved and Released projects and drops anything still on step 0 — the scout
 * list shows Registered projects too, and a scout would see them scored zero.
 * The deeper fix is to parameterise the helper's visibility filter in the prisma
 * package; until then these weights and its own must be changed together.
 */
export const activityScore = (
	reports: number,
	recentReports: number,
	updatedAt: Date,
	now = Date.now(),
): number =>
	reports * 2 +
	recentReports * 3 +
	(updatedAt.getTime() > now - MONTH_MS ? 0.5 : 0);
