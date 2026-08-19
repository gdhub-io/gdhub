"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import axios from "axios";

export type CardSection =
	| "team"
	| "files"
	| "activities"
	| "workflow"
	| "reviews"
	| "investment";

/**
 * One section of the open card.
 *
 * The query key carries the limit, so Overview's two-file digest and the Files
 * tab's full list are different entries rather than one overwriting the other.
 * That also makes "see more" a new key, hence `keepPreviousData`: the rows
 * already on screen stay while the longer page loads instead of blanking.
 */
export function useCardSection<T>(
	projectId: string,
	section: CardSection,
	limit?: number,
) {
	return useQuery<T>({
		placeholderData: keepPreviousData,
		queryKey: ["scout", "games", projectId, section, limit ?? null],
		queryFn: () =>
			axios
				.get(`/api/scout/games/${projectId}/${section}`, {
					params: { limit },
				})
				.then((res) => res.data),
	});
}
