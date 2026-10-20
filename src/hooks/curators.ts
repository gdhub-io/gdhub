"use client";

import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import type { AdminCuratorRowDto, CurationDto } from "@/types/checkpoints";

const CURATION = ["advisor", "curation"];

export const useCuration = () =>
	useQuery({
		queryKey: CURATION,
		queryFn: async () =>
			(await axios.get<CurationDto>("/api/advisor/curation")).data,
	});

export const useSaveCuration = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (body: { on: boolean; stages: string[] }) =>
			(await axios.put<CurationDto>("/api/advisor/curation", body)).data,
		onSuccess: (saved) => queryClient.setQueryData(CURATION, saved),
	});
};

export const useAskAgain = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () =>
			(await axios.post<CurationDto>("/api/advisor/curation/ask-again")).data,
		onSuccess: (saved) => queryClient.setQueryData(CURATION, saved),
	});
};

const ADMIN = ["admin", "curators"];

export const useAdminCurators = (filter: { pending: boolean; q?: string }) =>
	useQuery({
		queryKey: [...ADMIN, filter],
		queryFn: async () =>
			(
				await axios.get<AdminCuratorRowDto[]>("/api/admin/curators", {
					params: { pending: String(filter.pending), q: filter.q || undefined },
				})
			).data,
		placeholderData: keepPreviousData,
	});

export type CuratorDecisionBody =
	| { action: "approve" }
	| { action: "decline" | "revoke"; note: string };

/** Another admin decided first; the list is refetched either way. */
export const isAlreadyDecided = (error: unknown) =>
	axios.isAxiosError(error) &&
	error.response?.status === 409 &&
	error.response.data?.error === "alreadyDecided";

export const useDecideCurator = (userId: string) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (body: CuratorDecisionBody) =>
			(await axios.post(`/api/admin/curators/${userId}`, body)).data,
		// Refetched whichever way it went: a refusal means another admin decided.
		onSettled: () => queryClient.invalidateQueries({ queryKey: ADMIN }),
	});
};
