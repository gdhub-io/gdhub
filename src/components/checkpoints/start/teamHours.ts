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

	const statedFor = (row: TeamHoursRow) => {
		const stated = row.user.profile?.timeForWork ?? [];

		return [stated[0] ?? 0, stated[1] ?? stated[0] ?? 0] as [number, number];
	};

	const hours = members.reduce<[number, number]>(
		(sum, row) => {
			const [from, to] = statedFor(row);

			return [sum[0] + from, sum[1] + to];
		},
		[0, 0],
	);

	return {
		members,
		isLoading,
		statedFor,
		/** Hours a week, summed across the team. */
		hours,
		/** The same over the four sprints. */
		hoursPerRun: [
			hours[0] * SPRINTS_PER_CHECKPOINT,
			hours[1] * SPRINTS_PER_CHECKPOINT,
		] as [number, number],
	};
};
