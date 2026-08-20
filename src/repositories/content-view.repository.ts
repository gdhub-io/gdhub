import {
	ContentViewSubject,
	getAuditContext,
	withAuditContext,
} from "@gdhub-io/gdhub-prisma";
import { prisma } from "@/services/prisma";
import type { ContentViewSource } from "@/types/content-views";

/** The models carrying a `viewsCount`, which is what makes them countable. */
type ViewCountedModel =
	| "projectReport"
	| "blogPost"
	| "course"
	| "event"
	| "speciality"
	| "scoutCabinet"
	| "teamVacancy";

/**
 * The two calls a subject's table has to answer. Prisma's per-model delegates
 * have no common supertype, so the shared shape is spelled out rather than
 * inferred.
 */
type ViewCountedDelegate = {
	findMany(args: {
		where: { id: { in: string[] } };
		select: { id: true };
	}): Promise<{ id: string }[]>;
	updateMany(args: {
		where: { id: { in: string[] } };
		data: { viewsCount: { increment: number } };
	}): Promise<unknown>;
};

/** Wiring a new domain is a `viewsCount` column and one line here. */
const SUBJECT_MODEL: Record<ContentViewSubject, ViewCountedModel> = {
	[ContentViewSubject.ProjectReport]: "projectReport",
	[ContentViewSubject.BlogPost]: "blogPost",
	[ContentViewSubject.CoursePage]: "course",
	[ContentViewSubject.EventPage]: "event",
	[ContentViewSubject.ExpertPage]: "speciality",
	[ContentViewSubject.ScoutPage]: "scoutCabinet",
	[ContentViewSubject.VacancyPage]: "teamVacancy",
};

type RecordViewsParams = {
	subjectType: ContentViewSubject;
	ids: string[];
	viewerKey: string;
	/** Midnight UTC of the day being counted. */
	viewedOn: Date;
	source: ContentViewSource;
};

/**
 * Counts one viewer against a batch of content and returns how many of them this
 * was a first look at today.
 *
 * Deduplication is the unique index on (subject, viewer, day), not a
 * read-then-write check: two requests racing on the same pair cannot both win, so
 * a viewer who reloads all day still owns one row and adds one to `viewsCount`.
 */
export async function recordContentViews({
	subjectType,
	ids,
	viewerKey,
	viewedOn,
	source,
}: RecordViewsParams): Promise<number> {
	const model = SUBJECT_MODEL[subjectType];
	const fromFeed = source === "feed";

	// A client can name anything, and `subjectId` carries no foreign key, so this
	// filter is the only thing keeping invented ids out. It needs no transactional
	// visibility with the writes, so it stays outside and off the pinned
	// connection.
	const found = await (prisma[model] as ViewCountedDelegate).findMany({
		where: { id: { in: ids } },
		select: { id: true },
	});

	if (found.length === 0) return 0;

	const known = found.map((row) => row.id);

	// Seeing something is not an auditable act. Left alone the counter bump would
	// write an `AuditLog` row per request — over a second pool connection, after
	// re-running the query above — recording a field the allowlist does not even
	// carry.
	return withAuditContext({ ...getAuditContext(), suppressAudit: true }, () =>
		prisma.$transaction(async (tx) => {
			const created = await tx.contentView.createManyAndReturn({
				data: known.map((subjectId) => ({
					subjectType,
					subjectId,
					viewerKey,
					viewedOn,
					fromFeed,
					fromPage: !fromFeed,
				})),
				skipDuplicates: true,
				select: { subjectId: true },
			});

			if (created.length > 0) {
				await (tx[model] as ViewCountedDelegate).updateMany({
					where: { id: { in: created.map((row) => row.subjectId) } },
					data: { viewsCount: { increment: 1 } },
				});
			}

			// Meeting content in a feed and then opening it is one view, but the row
			// has to remember both — that split is the only thing `fromFeed` and
			// `fromPage` are for.
			if (created.length < known.length) {
				const fresh = new Set(created.map((row) => row.subjectId));
				const flag = fromFeed ? "fromFeed" : "fromPage";

				await tx.contentView.updateMany({
					where: {
						subjectType,
						subjectId: { in: known.filter((id) => !fresh.has(id)) },
						viewerKey,
						viewedOn,
						[flag]: false,
					},
					data: { [flag]: true },
				});
			}

			return created.length;
		}),
	);
}

/** Drops view rows past their retention. The subjects' counters are unaffected. */
export async function pruneContentViews(olderThan: Date): Promise<number> {
	const { count } = await prisma.contentView.deleteMany({
		where: { viewedOn: { lt: olderThan } },
	});

	return count;
}
