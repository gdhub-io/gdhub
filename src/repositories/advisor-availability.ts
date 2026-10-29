import {
	AdvisorAvailabilityStatus,
	CheckpointCuratorKind,
	CheckpointStatus,
} from "@gdhub-io/gdhub-prisma";
import dayjs from "dayjs";
import { SESSION_MINUTES } from "@/config/checkpoint";
import {
	type Availability,
	type AvailabilityRule,
	type Busy,
	callsOutside,
	earliestFirstCall,
	freeCallsBetween,
	freeFirstCalls,
	type MinuteRange,
	seriesAt,
} from "@/lib/advisor-availability";
import { dueDateFrom, utcStartOfDay } from "@/lib/checkpoint-days";
import { CHECKPOINT_OPEN_STATUSES } from "@/lib/checkpoint-status";
import { prisma } from "@/services/prisma";

/** The client, or the one an interactive transaction hands its callback. */
export type Db = Omit<
	typeof prisma,
	"$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

export type AvailabilityDto = {
	timeZone: string;
	status: AdvisorAvailabilityStatus;
	awayUntil: string | null;
	consultationsPerMonth: number | null;
	confirmedAt: string | null;
	rules: AvailabilityRule[];
};

export type BookedCall = {
	sessionId: string;
	index: number;
	scheduledAt: string;
	checkpointId: string;
	checkpointStatus: CheckpointStatus;
	projectName: string;
	projectSlug: string;
};

const day = (date: Date | null) =>
	date ? dayjs.utc(date).format("YYYY-MM-DD") : null;

const toRule = (row: {
	monthFrom: Date | null;
	monthTo: Date | null;
	weekdays: number[];
	ranges: unknown;
	forConsultations: boolean;
	forCheckpoints: boolean;
}): AvailabilityRule => ({
	monthFrom: day(row.monthFrom),
	monthTo: day(row.monthTo),
	weekdays: row.weekdays,
	ranges: row.ranges as MinuteRange[],
	forConsultations: row.forConsultations,
	forCheckpoints: row.forCheckpoints,
});

const findAvailability = (userId: string, db: Db = prisma) =>
	db.advisorAvailability.findUnique({
		where: { userId },
		include: { rules: true },
	});

type AvailabilityRow = NonNullable<
	Awaited<ReturnType<typeof findAvailability>>
>;

const toAvailability = (row: AvailabilityRow): Availability => ({
	timeZone: row.timeZone,
	status: row.status,
	awayUntil: row.awayUntil,
	confirmedAt: row.confirmedAt,
	rules: row.rules.map(toRule),
});

const loadAvailability = async (userId: string, db: Db = prisma) => {
	const row = await findAvailability(userId, db);
	return row ? toAvailability(row) : null;
};

export const getAvailability = async (
	userId: string,
): Promise<AvailabilityDto | null> => {
	const row = await findAvailability(userId);
	if (!row) return null;

	return {
		timeZone: row.timeZone,
		status: row.status,
		awayUntil: row.awayUntil?.toISOString() ?? null,
		consultationsPerMonth: row.consultationsPerMonth,
		confirmedAt: row.confirmedAt?.toISOString() ?? null,
		rules: row.rules.map(toRule),
	};
};

/** Calls that still hold the time of these curators. */
const holdingCalls = (curatorId: string | { in: string[] }) => ({
	scheduledAt: { gte: dayjs().subtract(1, "day").toDate() },
	checkpoint: { curatorId, status: { in: CHECKPOINT_OPEN_STATUSES } },
});

const callSelect = {
	id: true,
	index: true,
	scheduledAt: true,
	checkpoint: {
		select: {
			id: true,
			status: true,
			project: { select: { name: true, slug: true } },
		},
	},
} as const;

const toBookedCall = (row: {
	id: string;
	index: number;
	scheduledAt: Date;
	checkpoint: {
		id: string;
		status: CheckpointStatus;
		project: { name: string; slug: string };
	};
}): BookedCall => ({
	sessionId: row.id,
	index: row.index,
	scheduledAt: row.scheduledAt.toISOString(),
	checkpointId: row.checkpoint.id,
	checkpointStatus: row.checkpoint.status,
	projectName: row.checkpoint.project.name,
	projectSlug: row.checkpoint.project.slug,
});

/** Checkpoint calls still ahead that hold this advisor's time. */
const bookedCalls = async (userId: string): Promise<BookedCall[]> =>
	(
		await prisma.checkpointSession.findMany({
			where: holdingCalls(userId),
			orderBy: { scheduledAt: "asc" },
			select: callSelect,
		})
	).map(toBookedCall);

const busyAt = (start: Date): Busy => ({
	start,
	end: dayjs(start).add(SESSION_MINUTES, "minute").toDate(),
});

/** What already holds this advisor's time, less one checkpoint's own calls. */
const busyOf = async (
	userId: string,
	db: Db = prisma,
	exceptCheckpointId?: string,
) => {
	const { checkpoint, ...where } = holdingCalls(userId);
	const rows = await db.checkpointSession.findMany({
		where: {
			...where,
			checkpoint: {
				...checkpoint,
				...(exceptCheckpointId && { id: { not: exceptCheckpointId } }),
			},
		},
		select: { scheduledAt: true },
	});

	return rows.map((row) => busyAt(row.scheduledAt));
};

export type SaveAvailabilityInput = {
	timeZone: string;
	status: AdvisorAvailabilityStatus;
	awayUntil: Date | null;
	consultationsPerMonth: number | null;
	rules: AvailabilityRule[];
};

/**
 * Saves the advisor's hours whole. Refused while any booked checkpoint call
 * would fall outside them: a checkpoint is an agreement, and its calls are
 * moved one by one with the author, never by a change of hours.
 */
export const saveAvailability = async (
	userId: string,
	input: SaveAvailabilityInput,
) => {
	const calls = await bookedCalls(userId);
	const outside = callsOutside(
		input.rules,
		input.timeZone,
		calls.map((call) => ({
			id: call.sessionId,
			scheduledAt: new Date(call.scheduledAt),
		})),
	);

	if (outside.length > 0) {
		const ids = new Set(outside.map((call) => call.id));
		return {
			ok: false as const,
			outside: calls.filter((call) => ids.has(call.sessionId)),
		};
	}

	const data = {
		timeZone: input.timeZone,
		status: input.status,
		awayUntil:
			input.status === AdvisorAvailabilityStatus.Away ? input.awayUntil : null,
		consultationsPerMonth: input.consultationsPerMonth,
	};
	const rules = input.rules.map((rule) => ({
		monthFrom: rule.monthFrom ? new Date(rule.monthFrom) : null,
		monthTo: rule.monthTo ? new Date(rule.monthTo) : null,
		weekdays: rule.weekdays,
		ranges: rule.ranges,
		forConsultations: rule.forConsultations,
		forCheckpoints: rule.forCheckpoints,
	}));

	// Saving the hours is saying they are right, so it confirms them as well.
	await prisma.$transaction([
		prisma.advisorAvailability.upsert({
			where: { userId },
			create: { userId, ...data, confirmedAt: new Date() },
			update: { ...data, confirmedAt: new Date() },
		}),
		prisma.advisorAvailabilityRule.deleteMany({ where: { userId } }),
		prisma.advisorAvailabilityRule.createMany({
			data: rules.map((rule) => ({ userId, ...rule })),
		}),
	]);

	return { ok: true as const };
};

/** "Still correct": the hours are confirmed without a change. */
export const confirmAvailability = (userId: string) =>
	prisma.advisorAvailability.updateMany({
		where: { userId },
		data: { confirmedAt: new Date() },
	});

/** First calls that open a free series with this advisor, between two of their days. */
export const freeFirstCallsFor = async (
	advisorId: string,
	from: string,
	to: string,
) => {
	const availability = await loadAvailability(advisorId);
	if (!availability) return { timeZone: null, starts: [] };

	const busy = await busyOf(advisorId);

	return {
		timeZone: availability.timeZone,
		starts: freeFirstCalls(availability, busy, from, to).map((date) =>
			date.toISOString(),
		),
	};
};

/** Each advisor's earliest free series; an advisor with none is left out. */
export const earliestFirstCalls = async (advisorIds: string[]) => {
	const earliest = new Map<string, string>();
	if (advisorIds.length === 0) return earliest;

	const [rows, sessions] = await Promise.all([
		prisma.advisorAvailability.findMany({
			where: { userId: { in: advisorIds } },
			include: { rules: true },
		}),
		prisma.checkpointSession.findMany({
			where: holdingCalls({ in: advisorIds }),
			select: {
				scheduledAt: true,
				checkpoint: { select: { curatorId: true } },
			},
		}),
	]);

	for (const row of rows) {
		const busy = sessions
			.filter((session) => session.checkpoint.curatorId === row.userId)
			.map((session) => busyAt(session.scheduledAt));
		const at = earliestFirstCall(toAvailability(row), busy);
		if (at) earliest.set(row.userId, at.toISOString());
	}

	return earliest;
};

/** Whether a first call still opens a free series with this advisor. */
export const isFirstCallFree = async (
	advisorId: string,
	first: Date,
	exceptCheckpointId?: string,
) => {
	const availability = await loadAvailability(advisorId);
	if (!availability) return false;

	const busy = await busyOf(advisorId, prisma, exceptCheckpointId);

	return !!seriesAt(availability, first, busy);
};

/**
 * Hours a booked call of this checkpoint may move to: free single calls in the
 * curator's hours, its own calls left out of what is busy. Pass the
 * transaction to read under its lock.
 */
export const freeMoveSlots = async (
	curatorId: string,
	checkpointId: string,
	window: { from: Date; to: Date },
	db: Db = prisma,
) => {
	const [availability, busy] = await Promise.all([
		loadAvailability(curatorId, db),
		busyOf(curatorId, db, checkpointId),
	]);
	return availability
		? freeCallsBetween(availability, busy, window.from, window.to)
		: [];
};

/** Takes the curator's hours for the rest of the caller's transaction. */
export const lockCurator = (tx: Db, curatorId: string) =>
	tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${curatorId}))`;

export class SlotTakenError extends Error {
	constructor() {
		super("slotTaken");
	}
}

/**
 * Books the five calls of a checkpoint with a human curator from its first call
 * (`startedAt`), and dates the checkpoint from that day. Inside the caller's
 * transaction, under a lock on the curator, so two authors cannot take the same
 * hour; throws `SlotTakenError` when the series is no longer free.
 */
export const bookSessions = async (tx: Db, checkpointId: string) => {
	const checkpoint = await tx.projectCheckpoint.findUniqueOrThrow({
		where: { id: checkpointId },
		select: { curatorKind: true, curatorId: true, startedAt: true },
	});

	if (
		checkpoint.curatorKind !== CheckpointCuratorKind.Human ||
		!checkpoint.curatorId
	)
		return;
	if (!checkpoint.startedAt) throw new SlotTakenError();

	await lockCurator(tx, checkpoint.curatorId);

	const availability = await loadAvailability(checkpoint.curatorId, tx);
	if (!availability) throw new SlotTakenError();

	const busy = await busyOf(checkpoint.curatorId, tx, checkpointId);
	const calls = seriesAt(availability, checkpoint.startedAt, busy);
	if (!calls) throw new SlotTakenError();

	const startedAt = utcStartOfDay(checkpoint.startedAt);

	await tx.checkpointSession.deleteMany({ where: { checkpointId } });
	await tx.checkpointSession.createMany({
		data: calls.map((at, offset) => ({
			checkpointId,
			index: offset + 1,
			scheduledAt: at.toDate(),
		})),
	});
	await tx.projectCheckpoint.update({
		where: { id: checkpointId },
		data: { startedAt, dueAt: dueDateFrom(startedAt) },
	});
};

/** The advisor's calendar: checkpoint calls ahead of them, and the recent ones behind. */
export const advisorCalendar = async (userId: string) => {
	const [availability, rows] = await Promise.all([
		prisma.advisorAvailability.findUnique({
			where: { userId },
			select: { timeZone: true },
		}),
		prisma.checkpointSession.findMany({
			where: {
				scheduledAt: { gte: dayjs().subtract(60, "day").toDate() },
				checkpoint: {
					curatorId: userId,
					status: {
						in: [...CHECKPOINT_OPEN_STATUSES, CheckpointStatus.Closed],
					},
				},
			},
			orderBy: { scheduledAt: "asc" },
			select: { ...callSelect, endedAt: true },
		}),
	]);

	const now = Date.now();
	const calls = rows.map((row) => ({
		...toBookedCall(row),
		endedAt: row.endedAt?.toISOString() ?? null,
	}));
	const ahead = (call: (typeof calls)[number]) =>
		!call.endedAt &&
		new Date(call.scheduledAt).getTime() + SESSION_MINUTES * 60_000 > now;

	return {
		timeZone: availability?.timeZone ?? null,
		upcoming: calls.filter(ahead),
		past: calls.filter((call) => !ahead(call)).reverse(),
	};
};

export type AdvisorCalendar = Awaited<ReturnType<typeof advisorCalendar>>;
