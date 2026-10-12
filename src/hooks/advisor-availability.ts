"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type {
	AdvisorCalendar,
	AvailabilityDto,
	BookedCall,
} from "@/repositories/advisor-availability";
import type { AvailabilityBody } from "@/schemas/advisor-availability";

const KEY = ["advisor-availability"];

/** The signed-in advisor's hours; null until they first save them. */
export const useAvailability = () =>
	useQuery({
		queryKey: KEY,
		queryFn: async () =>
			(await axios.get<AvailabilityDto | null>("/api/advisor/availability"))
				.data,
	});

/** Refused with 409 while booked checkpoint calls fall outside the new hours. */
export type SaveRefused = { ok: false; outside: BookedCall[] };

export const isSaveRefused = (
	error: unknown,
): error is { response: { data: SaveRefused } } =>
	axios.isAxiosError(error) && error.response?.status === 409;

/** The picked first call was booked by someone else in the meantime. */
export const isSlotTaken = (error: unknown) =>
	axios.isAxiosError(error) && error.response?.data?.error === "slotTaken";

export const useSaveAvailability = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (body: AvailabilityBody) =>
			(await axios.put<AvailabilityDto>("/api/advisor/availability", body))
				.data,
		onSuccess: (data) => queryClient.setQueryData(KEY, data),
	});
};

export const useConfirmAvailability = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => axios.post("/api/advisor/availability/confirm"),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
	});
};

export const useAdvisorCalendar = () =>
	useQuery({
		queryKey: ["advisor-calendar"],
		queryFn: async () =>
			(await axios.get<AdvisorCalendar>("/api/advisor/calendar")).data,
	});

/** First calls that open five free weekly calls with a curator, between two days. */
export const useFirstCalls = (
	curatorId: string | null | undefined,
	from: string,
	to: string,
) =>
	useQuery({
		queryKey: ["checkpoint-first-calls", curatorId, from, to],
		queryFn: async () =>
			(
				await axios.get<{ timeZone: string | null; starts: string[] }>(
					`/api/checkpoint/curators/${curatorId}/first-calls`,
					{ params: { from, to } },
				)
			).data,
		enabled: !!curatorId,
	});
