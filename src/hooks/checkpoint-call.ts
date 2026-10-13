"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { CALL_WAIT_POLL_SECONDS } from "@/config/checkpoint";
import type { CheckpointCallDto } from "@/repositories/checkpoint-call";

/** An early room is asked again this often, so the page opens on time. */
const EARLY_POLL_MS = 30_000;

const callKey = (id: string, index: number) => ["checkpoint-call", id, index];
const callUrl = (id: string, index: number) =>
	`/api/checkpoint/${id}/sessions/${index}`;

/**
 * The call as the viewer sees it. `poll` is off once they are in the room —
 * Daily tells them what changes from then on.
 */
export const useCheckpointCall = (
	id: string,
	index: number,
	{ poll }: { poll: boolean },
) =>
	useQuery({
		queryKey: callKey(id, index),
		queryFn: async () =>
			(await axios.get<CheckpointCallDto>(callUrl(id, index))).data,
		retry: (count, error) =>
			!(axios.isAxiosError(error) && error.response?.status === 404) &&
			count < 2,
		refetchInterval: (query) => {
			const call = query.state.data;
			if (!call || !poll) return false;
			if (call.state === "early") return EARLY_POLL_MS;
			const waiting =
				call.state === "open" && call.role === "team" && !call.curatorJoinedAt;
			return waiting ? CALL_WAIT_POLL_SECONDS * 1000 : false;
		},
	});

/** Whether the token endpoint refused the join, rather than failing. */
export const isCallRefusal = (error: unknown) => {
	if (!axios.isAxiosError(error) || error.response?.status !== 403)
		return false;
	const reason = (error.response.data as { error?: string } | undefined)?.error;
	return reason === "notOpen" || reason === "curatorNotIn";
};

export const useJoinCall = (id: string, index: number) =>
	useMutation({
		mutationFn: async () =>
			(
				await axios.post<{ url: string; token: string }>(
					`${callUrl(id, index)}/token`,
				)
			).data,
	});

export const useEndCall = (id: string, index: number) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			await axios.post(`${callUrl(id, index)}/end`);
		},
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: callKey(id, index) }),
	});
};
