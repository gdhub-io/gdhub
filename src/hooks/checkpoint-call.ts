"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
	CALL_PRESENCE_POLL_SECONDS,
	CALL_WAIT_POLL_SECONDS,
} from "@/config/checkpoint";
import type {
	CallNotesDto,
	CallPresenceDto,
	CheckpointCallDto,
} from "@/repositories/checkpoint-call";
import type { CallMoveOptionsDto } from "@/repositories/checkpoint-call-move";
import type { PlanChange } from "@/schemas/checkpoint";

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

/** The call's people and who is in the room; asked again only while it is open. */
export const useCallPresence = (id: string, index: number, open: boolean) =>
	useQuery({
		queryKey: ["checkpoint-call-presence", id, index],
		queryFn: async () =>
			(await axios.get<CallPresenceDto>(`${callUrl(id, index)}/presence`)).data,
		refetchInterval: open ? CALL_PRESENCE_POLL_SECONDS * 1000 : false,
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

/** One change to the plan; the page re-reads it before the promise settles. */
export const useChangePlan = (id: string) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (change: PlanChange) => {
			await axios.patch(`/api/checkpoint/${id}/plan`, change);
		},
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: ["checkpoint-call", id] }),
				queryClient.invalidateQueries({ queryKey: ["checkpoint-review", id] }),
			]),
	});
};

/** A held call's summary and transcript; `index` null while no call is held. */
export const useCallNotes = (id: string, index: number | null) =>
	useQuery({
		queryKey: ["checkpoint-call-notes", id, index],
		queryFn: async () =>
			(await axios.get<CallNotesDto>(`${callUrl(id, index ?? 0)}/notes`)).data,
		enabled: index !== null,
	});

const moveUrl = (id: string, index: number) => `${callUrl(id, index)}/move`;

/** The free hours a call may move to; asked when the move modal opens. */
export const useCallMoveOptions = (id: string, index: number, open: boolean) =>
	useQuery({
		queryKey: ["checkpoint-call-move", id, index],
		queryFn: async () =>
			(await axios.get<CallMoveOptionsDto>(moveUrl(id, index))).data,
		enabled: open,
		staleTime: 0,
	});

/** Ask, answer or take back a request to move a call; the call is read again after. */
export const useCallMove = (id: string, index: number) => {
	const queryClient = useQueryClient();
	// The call page and the Workflow path both show the call's time.
	const onSuccess = () =>
		Promise.all([
			queryClient.invalidateQueries({ queryKey: callKey(id, index) }),
			queryClient.invalidateQueries({ queryKey: ["checkpoint", id] }),
		]);

	return {
		ask: useMutation({
			mutationFn: (moveTo: string) =>
				axios.post(moveUrl(id, index), { moveTo }),
			onSuccess,
		}),
		answer: useMutation({
			mutationFn: (approve: boolean) =>
				axios.patch(moveUrl(id, index), { approve }),
			onSuccess,
		}),
		withdraw: useMutation({
			mutationFn: () => axios.delete(moveUrl(id, index)),
			onSuccess,
		}),
	};
};
