"use client";

import {
	type QueryClient,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import type { CheckpointFeedbackDto } from "@/types/checkpoints";

/** Null for anyone who may not rate; for the rater, their rating or null while unanswered. */
export type CheckpointFeedbackState = {
	feedback: CheckpointFeedbackDto | null;
} | null;

export type RateCheckpointInput = { rating: number; comment?: string };

const feedbackKey = (id: string) => ["checkpoint-feedback", id];

/** The rating block of a checkpoint's results; the server decides who gets one. */
export const useCheckpointFeedback = (id: string) =>
	useQuery({
		queryKey: feedbackKey(id),
		queryFn: async () =>
			(
				await axios.get<CheckpointFeedbackState>(
					`/api/checkpoint/${id}/feedback`,
				)
			).data,
		// It changes only through this block's own one write.
		refetchOnWindowFocus: false,
	});

/** The rating saved first, when the server refused a second write. */
export const alreadyRatedFeedback = (
	error: unknown,
): CheckpointFeedbackDto | null => {
	if (!axios.isAxiosError(error) || error.response?.status !== 409) return null;
	return error.response.data?.details?.feedback ?? null;
};

const showSent = (
	queryClient: QueryClient,
	id: string,
	feedback: CheckpointFeedbackDto,
) =>
	queryClient.setQueryData(feedbackKey(id), {
		feedback,
	} satisfies CheckpointFeedbackState);

/** Rates once: the answer, or the rating another tab already sent, becomes the sent view. */
export const useRateCheckpoint = (id: string) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: RateCheckpointInput) =>
			(
				await axios.post<CheckpointFeedbackDto>(
					`/api/checkpoint/${id}/feedback`,
					input,
				)
			).data,
		onSuccess: (feedback) => showSent(queryClient, id, feedback),
		onError: (error) => {
			const saved = alreadyRatedFeedback(error);
			if (saved) showSent(queryClient, id, saved);
		},
	});
};
