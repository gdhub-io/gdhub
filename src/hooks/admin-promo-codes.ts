"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { NewPromoCode, PromoCodeDto } from "@/types/checkpoints";

const PROMO_CODES_QUERY_KEY = ["admin", "checkpoints", "promo-codes"];

const URL = "/api/admin/checkpoints/promo-codes";

export const usePromoCodes = (enabled = true) =>
	useQuery({
		queryKey: PROMO_CODES_QUERY_KEY,
		queryFn: async () => (await axios.get<PromoCodeDto[]>(URL)).data,
		enabled,
	});

export const useCreatePromoCode = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (body: NewPromoCode) =>
			(await axios.post<PromoCodeDto>(URL, body)).data,
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: PROMO_CODES_QUERY_KEY }),
	});
};

export const useSetPromoCodeActive = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, active }: { id: string; active: boolean }) =>
			(await axios.patch<PromoCodeDto>(`${URL}/${id}`, { active })).data,
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: PROMO_CODES_QUERY_KEY }),
	});
};

/** A duplicate code is the one create failure the form answers on a field. */
export const isPromoCodeTaken = (error: unknown) =>
	axios.isAxiosError(error) &&
	error.response?.status === 409 &&
	error.response.data?.error === "codeTaken";
