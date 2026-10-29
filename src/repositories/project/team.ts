import { TeamMemberStatus } from "@gdhub-io/gdhub-prisma";
import { prisma } from "@/services/prisma";

/**
 * Someone who was really on the team rather than an applicant or a rejection —
 * whether or not they are still on it.
 */
export const CONFIRMED_STATUS = {
	// Not `as const`: Prisma's `in` wants a mutable array, and a readonly tuple
	// makes it fall back to the overload without `select`, silently widening
	// every row to the whole Project model.
	status: { in: [TeamMemberStatus.Hired, TeamMemberStatus.Founder] },
};

/**
 * The team as it stands today. Without `finishedAt`, a departed member still
 * counts towards the team size and the seats the investment estimate prices —
 * so anything sizing the team wants this, and anything telling its history
 * wants `CONFIRMED_STATUS`.
 */
export const CONFIRMED_MEMBERS = { ...CONFIRMED_STATUS, finishedAt: null };

/**
 * The query part that finds the row putting `userId` on a team today, for a
 * nested `members` select. A user fired and taken back has a Fired row beside the
 * new one, so the newest current row decides.
 */
export const currentMemberOf = (userId: string) => ({
	where: { ...CONFIRMED_MEMBERS, userId },
	orderBy: { startedAt: "desc" as const },
	take: 1,
});

type TeamScope = { teamId: string } | { projectId: string };

/** The row that puts `userId` on the team today, or null (GDHUB-76). */
export const currentMembership = (
	userId: string,
	scope: TeamScope,
	db: Pick<typeof prisma, "teamMember"> = prisma,
) => {
	const { where, orderBy } = currentMemberOf(userId);
	return db.teamMember.findFirst({
		where: {
			...where,
			...("teamId" in scope
				? { teamId: scope.teamId }
				: { team: { projectId: scope.projectId } }),
		},
		orderBy,
		select: { id: true, teamId: true, status: true, startedAt: true },
	});
};
