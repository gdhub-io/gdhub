import { TeamMemberStatus } from "@gdhub-io/gdhub-prisma";

/**
 * Who counts as a member of a team, wherever the whole roster is meant.
 *
 * Founders, the hired, and the ones who were let go — an applicant or a
 * rejection was never on the team, and a departure was. The team page counts
 * them this way, so anything else reading a team's size or its stated hours
 * reads the same list rather than a second opinion.
 *
 * Not `as const`: Prisma's `in` wants a mutable array, and a readonly tuple
 * makes it fall back to the overload without `select`.
 */
export const TEAM_ROSTER_STATUSES = [
	TeamMemberStatus.Founder,
	TeamMemberStatus.Hired,
	TeamMemberStatus.Fired,
];
