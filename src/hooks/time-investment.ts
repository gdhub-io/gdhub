"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

/** The signed-in person's time investment (GDHUB-141). */
export type TimeInvestment = {
	timeForWork: number[];
	isActive: boolean;
	changedAt: string | null;
};

const KEY = ["user", "availability"];

export const useTimeInvestment = (enabled = true) =>
	useQuery({
		queryKey: KEY,
		queryFn: () =>
			axios.get<TimeInvestment>("/api/user/availability").then((r) => r.data),
		enabled,
		staleTime: 60_000,
	});

export const useSaveTimeInvestment = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: { timeForWork: number[]; isActive: boolean }) =>
			axios
				.put<TimeInvestment>("/api/user/availability", input)
				.then((r) => r.data),
		onSuccess: (saved) => queryClient.setQueryData(KEY, saved),
	});
};
