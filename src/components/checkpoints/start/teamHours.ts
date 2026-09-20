"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { SPRINTS_PER_CHECKPOINT } from "@/lib/checkpoint-sprints";

export type TeamHoursRow = {
	id: string;
	userId: string;
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
		queryFn: async () =>
			(
				await axios.get<{ members: TeamHoursRow[] }>("/api/user/project/team", {
					params: { teamId },
				})
			).data,
		enabled: !!teamId,
	});

	const members = data?.members ?? [];

	/** Null where the member has said nothing: unknown is not zero. */
	const statedFor = (row: TeamHoursRow): [number, number] | null => {
		const stated = row.user.profile?.timeForWork ?? [];

		if (!stated.length) return null;

		return [stated[0] ?? 0, stated[1] ?? stated[0] ?? 0];
	};

	const hours = members.reduce<[number, number]>(
		(sum, row) => {
			const stated = statedFor(row);

			return stated ? [sum[0] + stated[0], sum[1] + stated[1]] : sum;
		},
		[0, 0],
	);

	return {
		members,
		isLoading,
		statedFor,
		/** How many of them answered — "5 members, 2 of whom stated" is its own fact. */
		stated: members.filter((row) => statedFor(row)).length,
		/** Hours a week, summed across the team. */
		hours,
		/** The same over the four sprints. */
		hoursPerRun: [
			hours[0] * SPRINTS_PER_CHECKPOINT,
			hours[1] * SPRINTS_PER_CHECKPOINT,
		] as [number, number],
	};
};
