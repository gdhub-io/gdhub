"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { CheckpointReviewDto } from "@/repositories/checkpoint-review";

/** An AI checkpoint's Curator's Review; the plan on it changes through `useChangePlan`. */
export const useCheckpointReview = (id: string) =>
	useQuery({
		queryKey: ["checkpoint-review", id],
		queryFn: async () =>
			(await axios.get<CheckpointReviewDto>(`/api/checkpoint/${id}/review`))
				.data,
		// It changes only through this page's own edits and the daily run.
		refetchOnWindowFocus: false,
		retry: (count, error) =>
			!(axios.isAxiosError(error) && error.response?.status === 404) &&
			count < 2,
	});

/** The AI reads the tasks as saved; the page — review or call — re-reads its advice. */
export const useAdvisePlan = (id: string) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			await axios.post(`/api/checkpoint/${id}/plan/advice`);
		},
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: ["checkpoint-review", id] }),
				queryClient.invalidateQueries({ queryKey: ["checkpoint-call", id] }),
			]),
	});
};
