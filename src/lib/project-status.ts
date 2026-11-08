import { type Prisma, ProjectStatus } from "@gdhub-io/gdhub-prisma";
import dayjs from "dayjs";

export const DORMANT_AFTER_MONTHS = 3;
export const ARCHIVE_AFTER_DORMANT_DAYS = 14;

/** An Approved project with nothing done for `DORMANT_AFTER_MONTHS`; one on the stores is finished, not idle. */
export const shouldGoDormant = ({
	lastActivityAt,
	onStores,
	now,
}: {
	lastActivityAt: Date;
	onStores: boolean;
	now: Date;
}) =>
	!onStores &&
	lastActivityAt <= dayjs(now).subtract(DORMANT_AFTER_MONTHS, "month").toDate();

export const resolveDormantTransition = ({
	dormantAt,
	lastActivityAt,
	now,
}: {
	dormantAt: Date;
	lastActivityAt: Date;
	now: Date;
}): "reactivate" | "archive" | null => {
	if (lastActivityAt > dormantAt) return "reactivate";
	const archiveAt = dayjs(dormantAt)
		.add(ARCHIVE_AFTER_DORMANT_DAYS, "day")
		.toDate();
	return now >= archiveAt ? "archive" : null;
};

// `statusChangedAt` counts as activity, and `dormantAt` is the same `now`: the
// strict `>` in `resolveDormantTransition` is what keeps a fresh Dormant asleep.
// Freeze dates are cleared on approval so skill capital never reads a stale one.
export const statusChangeData = (
	status: ProjectStatus,
	now: Date,
): Prisma.ProjectUpdateInput => {
	const data: Prisma.ProjectUpdateInput = {
		status,
		statusChangedAt: now,
		updatedAt: now,
	};

	switch (status) {
		case ProjectStatus.Approved:
			return {
				...data,
				dormantAt: null,
				archivedAt: null,
				killedWithDignityAt: null,
			};
		case ProjectStatus.Dormant:
			return { ...data, dormantAt: now };
		case ProjectStatus.Archived:
			return { ...data, archivedAt: now };
		case ProjectStatus.KilledWithDignity:
			return { ...data, killedWithDignityAt: now };
		default:
			return data;
	}
};
