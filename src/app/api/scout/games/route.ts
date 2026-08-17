import { TeamVacancyStatus } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import { json, pipe, withAuth, withValidation } from "@/lib/api-handlers";
import { pageMeta, paginateInMemory } from "@/lib/pagination";
import { withSpaceGuard } from "@/lib/space-guard";
import {
	ABANDONED_FILTER,
	CONFIRMED_MEMBERS,
	DEFAULT_STAGE_FILTER,
	VISIBLE_STATUSES,
} from "@/repositories/scout.games";
import { estimateInvestment } from "@/services/investment/estimate";
import { prisma } from "@/services/prisma";

const csv = z
	.string()
	.optional()
	.transform((value) => (value ? value.split(",").filter(Boolean) : []));

/** Everything below `activity` is derived after the read — see SORT_CAP. */
export const SORT_FIELDS = [
	"activity",
	"activityScore",
	"toRelease",
	"applause",
	"reviews",
	"team",
] as const;

const QuerySchema = z.object({
	search: z.string().optional(),
	platforms: csv,
	genres: csv,
	stages: csv,
	// The list opens on what the scout is here for: the projects being worked
	// on hardest. `activity` — last touched — is the cheap SQL fallback.
	sort: z.enum(SORT_FIELDS).default("activityScore"),
	direction: z.enum(["asc", "desc"]).default("desc"),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(50).default(20),
});

type Query = z.infer<typeof QuerySchema>;

export type ScoutSortField = Query["sort"];

/**
 * How many projects a derived sort will pull into memory.
 *
 * `toRelease` and the rest are computed from the team and the workflow after
 * the rows are read, so the database cannot order by them — the whole filtered
 * set has to be estimated before it can be sorted, and only then paged. That is
 * fine at this catalogue's size and would not be at ten thousand: past that,
 * the estimate has to be written to a column and kept fresh by a job.
 *
 * Whatever the cap swallows, `paginateInMemory` counts only the rows actually
 * read, so the client is never offered a page that would come back empty.
 */
const SORT_CAP = 500;

const MONTH = 30 * 24 * 60 * 60 * 1000;

/**
 * The same weighting `prisma.project.getProjectsOrderedByActivity` uses: every
 * devlog post counts double, a post from the last month counts treble, and an
 * edit in the last month is worth half a point.
 *
 * Recomputed here rather than called, because that helper only looks at
 * Approved and Released projects and drops anything still on step 0 — this list
 * shows Registered projects too, and a scout would see them scored zero. The
 * deeper fix is to parameterise the helper's visibility filter in the prisma
 * package; until then these weights and its own must be changed together.
 */
const activityScore = (
	reports: number,
	recentReports: number,
	updatedAt: Date,
): number =>
	reports * 2 +
	recentReports * 3 +
	(updatedAt.getTime() > Date.now() - MONTH ? 0.5 : 0);

/** Investor money, summed inside each currency and dropped where it is zero. */
const totalPerCurrency = (
	investors: readonly { value: number; currency: string }[],
) => {
	const totals = new Map<string, number>();

	for (const investor of investors) {
		totals.set(
			investor.currency,
			(totals.get(investor.currency) ?? 0) + investor.value,
		);
	}

	return [...totals]
		.filter(([, amount]) => amount > 0)
		.map(([currency, amount]) => ({ currency, amount }));
};

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "scout.games.view" }),
	withValidation(QuerySchema, "query"),
)(async (_req, _ctx, { body }) => {
	const { search, platforms, genres, stages, sort, direction, page, limit } =
		body as Query;

	const byActivity = sort === "activity";

	const where = {
		status: { in: VISIBLE_STATUSES },
		...(search
			? { name: { contains: search, mode: "insensitive" as const } }
			: {}),
		...(platforms.length ? { platform: { in: platforms } } : {}),
		...(genres.length ? { genre: { in: genres } } : {}),
		// Named stages are honoured exactly, including the ones hidden by
		// default: picking "Support" is how a scout asks to see them.
		...(stages.length
			? { workflow: { currentStep: { name: { in: stages } } } }
			: {}),
		// Collected under `AND` because each is its own `NOT`, and spreading two
		// of those into one object silently keeps only the last.
		AND: [ABANDONED_FILTER, ...(stages.length ? [] : [DEFAULT_STAGE_FILTER])],
	};

	const projects = await prisma.project.findMany({
		where,
		orderBy: { updatedAt: "desc" },
		// Paged in the database when the database can do the ordering, and read
		// whole when it cannot — see SORT_CAP. Written as plain values rather
		// than a spread: a conditional spread makes the argument a union and
		// Prisma stops inferring the row type from `select`.
		skip: byActivity ? (page - 1) * limit : undefined,
		take: byActivity ? limit : SORT_CAP,
		select: {
			id: true,
			name: true,
			slug: true,
			coverImage: true,
			genre: true,
			platform: true,
			updatedAt: true,
			author: { select: { id: true, name: true, image: true } },
			workflow: {
				select: {
					currentStep: { select: { name: true, order: true } },
					// The project's own workflow is what the estimate is weighted
					// against — a schema is editable, so nothing may be assumed
					// about how many steps there are or what they are called.
					steps: { select: { name: true, order: true, done: true } },
				},
			},
			team: {
				select: {
					members: {
						where: CONFIRMED_MEMBERS,
						select: {
							speciality: { select: { level: true } },
							user: { select: { profile: { select: { timeForWork: true } } } },
						},
					},
					// Real money, as opposed to the estimate: what investors have
					// actually put into this team.
					investors: { select: { value: true, currency: true } },
					_count: {
						select: {
							vacancies: { where: { status: TeamVacancyStatus.Published } },
						},
					},
				},
			},
			_count: { select: { estimations: true, reports: true } },
		},
	});

	const projectIds = projects.map((project) => project.id);

	// Both are batched over the ids the read returned, and neither depends on
	// the other. Applause goes through the client extension rather than a join:
	// the relation form ships one row per activity per project and sums them in
	// Node, where the extension groups them in one statement.
	const [applause, recentReports, totalCount] = await Promise.all([
		prisma.project.getApplauseCounts({ projectIds }),
		prisma.projectReport
			.groupBy({
				by: ["projectId"],
				where: {
					projectId: { in: projectIds },
					publishedAt: { gt: new Date(Date.now() - MONTH) },
				},
				_count: { _all: true },
			})
			.then(
				(rows) =>
					new Map(rows.map((row) => [row.projectId, row._count._all] as const)),
			),
		// Only the SQL-paged branch needs it: everywhere else the rows in hand
		// are the whole answer, and `paginateInMemory` counts them.
		byActivity ? prisma.project.count({ where }) : Promise.resolve(0),
	]);

	const rows = projects.map((project) => {
		const members = project.team?.members ?? [];
		const steps = project.workflow?.steps ?? [];

		return {
			id: project.id,
			name: project.name,
			slug: project.slug,
			coverImage: project.coverImage,
			genre: project.genre,
			platform: project.platform,
			stage: project.workflow?.currentStep?.name ?? null,
			author: project.author,
			applauseCount: applause.get(project.id) ?? 0,
			reviewCount: project._count.estimations,
			teamSize: members.length,
			// What the team says it is looking for. Always null today: the schema
			// carries no such field. The scout reads the dash for what it is —
			// the team has not said — and has the estimate to fall back on.
			investment: null,
			// Totalled per currency rather than added up: an investor picks
			// theirs, so one sum across USD, EUR and XTR would mean nothing.
			raised: totalPerCurrency(project.team?.investors ?? []),
			devlogCount: project._count.reports,
			activityScore: activityScore(
				project._count.reports,
				recentReports.get(project.id) ?? 0,
				project.updatedAt,
			),
			// What it would take to see this one finished, and what it looks to
			// have cost so far — from the team, the workflow and the roles it
			// is still hiring for. Always labelled as a guess.
			estimatedInvestment: estimateInvestment({
				team: members.map((member) => ({
					level: member.speciality.level,
					hoursPerWeek: member.user.profile?.timeForWork ?? null,
				})),
				openPositions: project.team?._count.vacancies ?? 0,
				steps,
				currentStepOrder: project.workflow?.currentStep?.order ?? null,
			}),
			lastActivityAt: project.updatedAt,
		};
	});

	if (byActivity) {
		return json({ data: rows, meta: pageMeta(totalCount, page, limit) });
	}

	/**
	 * What each sort reads off a row, typed off the rows themselves so a change
	 * to the mapping above cannot drift past it. A project with no estimate
	 * sorts as zero rather than being dropped — it is a project with nobody on
	 * it, which is a fact about it, not a gap in the data.
	 */
	const sortKeys: Record<
		Exclude<ScoutSortField, "activity">,
		(row: (typeof rows)[number]) => number
	> = {
		toRelease: (row) => row.estimatedInvestment?.remaining ?? 0,
		applause: (row) => row.applauseCount,
		reviews: (row) => row.reviewCount,
		team: (row) => row.teamSize,
		activityScore: (row) => row.activityScore,
	};

	// Sorted here, not in SQL: every one of these is derived from the rows after
	// they are read. `activity` — last touched — is the one the database can do
	// on its own, and took the branch above.
	const sign = direction === "asc" ? 1 : -1;
	const key = sortKeys[sort];
	const sorted = [...rows].sort((a, b) => sign * (key(a) - key(b)));

	const { rows: data, meta } = paginateInMemory(sorted, page, limit);

	return json({ data, meta });
});
