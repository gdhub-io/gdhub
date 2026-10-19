"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { TeamMemberStatus } from "@/config/prisma-enums";

export type TeamHoursRow = {
	id: string;
	userId: string;
	status: string;
	finishedAt: string | null;
	position: string | null;
	speciality?: { name?: string | null } | null;
	user: {
		name: string | null;
		image: string | null;
		profile?: { timeForWork: number[] } | null;
	};
};

/**
 * What the team said it can put in, a week at a time.
 *
 * The same query the team tab already uses, read here for two purposes: the
 * table on the Planning question, and the signature the curator's read is cached
 * against — change the hours and the question genuinely changed.
 */
export const useTeamHours = (teamId?: string) => {
	const { data, isLoading } = useQuery({
		queryKey: ["user-project-team", teamId],
		// Stored as the whole response, the way MyTeam and UserTeam store it under
		// this key: whichever fetches first fills the cache the others read.
		queryFn: () =>
			axios.get<{ members: TeamHoursRow[] }>("/api/user/project/team", {
				params: { teamId },
			}),
		// The team page lists those who left too; the hours are the team as it stands.
		select: (res) =>
			res.data.members.filter(
				(row) => row.status !== TeamMemberStatus.Fired && !row.finishedAt,
			),
		enabled: !!teamId,
	});

	/** Null where the member has said nothing: unknown is not zero. */
	const statedFor = (row: TeamHoursRow): [number, number] | null => {
		const stated = row.user.profile?.timeForWork ?? [];

		if (!stated.length) return null;

		return [stated[0] ?? 0, stated[1] ?? stated[0] ?? 0];
	};

	return { members: data ?? [], isLoading, statedFor };
};
