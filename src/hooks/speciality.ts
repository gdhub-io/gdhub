import type { Speciality, WorkDirection } from "@gdhub-io/gdhub-prisma";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useMemo } from "react";
import type { SkillLevel } from "@/config/prisma-enums";
import { EXPERT_MIN_LEVEL, skillLevelsAtLeast } from "@/helpers/speciality";

type SpecialityWithDirection = Speciality & { direction: WorkDirection };

/**
 * The current user's work directions at `minLevel` or above — the client-side
 * half of the same rule the server enforces
 * (`repositories/user/speciality.ts`).
 *
 * Anywhere a form asks the user to pick a direction they will act in, this is
 * the list to offer: showing all of them and refusing on submit is a worse way
 * to say the same thing.
 */
export const useQualifiedDirections = (
	{ minLevel = EXPERT_MIN_LEVEL }: { minLevel?: SkillLevel } = {},
	{ enabled = true }: { enabled?: boolean } = {},
) => {
	const levels = useMemo(() => skillLevelsAtLeast(minLevel), [minLevel]);

	const { data: records, isLoading } = useQuery({
		queryKey: ["qualifiedSpecialities", levels],
		queryFn: () => {
			const params = new URLSearchParams();
			for (const level of levels) params.append("level", level);

			return axios.get<SpecialityWithDirection[]>(
				`/api/user/specialities?${params}`,
			);
		},
		enabled,
		staleTime: 5 * 60 * 1000,
	});

	const directions = useMemo(() => {
		const byId = new Map<string, WorkDirection>();
		for (const speciality of records?.data ?? []) {
			if (speciality.direction)
				byId.set(speciality.direction.id, speciality.direction);
		}

		return [...byId.values()];
	}, [records]);

	const options = useMemo(
		() =>
			directions.map((direction) => ({
				label: direction.name,
				value: direction.id,
			})),
		[directions],
	);

	return {
		directions,
		options,
		directionIds: useMemo(() => directions.map((d) => d.id), [directions]),
		/** Qualified in at least one direction. */
		isQualified: directions.length > 0,
		isLoading,
	};
};
