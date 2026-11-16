"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { SBORKA_WAIT_POLL_MS } from "@/config/live";
import type { SborkaSeatDto, SborkaStateDto } from "@/types/live";

const STATE_KEY = ["live-sborka"];
const URL = "/api/live/sborka";

/** Asked again while the room is closed, so a waiting guest sees it open. */
export const useSborkaState = ({ poll }: { poll: boolean }) =>
	useQuery({
		queryKey: STATE_KEY,
		queryFn: async () => (await axios.get<SborkaStateDto>(URL)).data,
		refetchInterval: (query) =>
			// Only a guest waits; nobody else opens the room for the host.
			poll && query.state.data?.open === false && !query.state.data.host
				? SBORKA_WAIT_POLL_MS
				: false,
	});

const useStudioMutation = <T>(fn: () => Promise<T>) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: fn,
		onSettled: () => queryClient.invalidateQueries({ queryKey: STATE_KEY }),
	});
};

export const useOpenSborka = () =>
	useStudioMutation(async () => (await axios.post(URL)).data);

export const useCloseSborka = () =>
	useStudioMutation(async () => (await axios.delete(URL)).data);

export const useSborkaSeat = () =>
	useMutation({
		mutationFn: async () =>
			(await axios.post<SborkaSeatDto>(`${URL}/seat`)).data,
	});

export const useReportHostLeft = () =>
	useStudioMutation(
		async () =>
			(await axios.post<{ closed: boolean }>(`${URL}/host-left`)).data,
	);

/** For `pagehide`: the host's tab is closing and no request may outlive it. */
export const closeSborkaOnExit = () =>
	fetch(URL, { method: "DELETE", keepalive: true });
