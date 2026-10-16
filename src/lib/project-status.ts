import { type Prisma, ProjectStatus } from "@gdhub-io/gdhub-prisma";
import dayjs from "dayjs";

export const ARCHIVE_AFTER_DORMANT_DAYS = 14;

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

// `updatedAt` is pinned to `now` because the cron reads it as activity: left to
// Prisma it lands a few ms after `dormantAt` and wakes the project on the next run.
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
