"use client";

import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import axios from "axios";
import { CHECKPOINT_PARTS } from "@/config/checkpoint";
import {
	CheckpointFeeReason,
	type ExpertInvoicing,
} from "@/config/prisma-enums";
import type { NoFeeReason } from "@/lib/checkpoints/fee";
import type { LegalAcceptanceInput } from "@/lib/legal/accept";
import type {
	AdminPayoutsDto,
	CuratorEarningsDto,
	PaidWorkDto,
	PayoutDetailsDto,
} from "@/types/checkpoints";

const ADMIN = ["admin", "payouts"];
const ADMIN_URL = "/api/admin/payouts";

/** `month` as `YYYY-MM`. */
export const useAdminPayouts = (month: string) =>
	useQuery({
		queryKey: [...ADMIN, "list", month],
		queryFn: async () =>
			(await axios.get<AdminPayoutsDto>(ADMIN_URL, { params: { month } })).data,
		placeholderData: keepPreviousData,
	});

export const usePayoutDetails = (curatorId?: string) =>
	useQuery({
		queryKey: [...ADMIN, "details", curatorId],
		queryFn: async () =>
			(
				await axios.get<PayoutDetailsDto>(`${ADMIN_URL}/details`, {
					params: { curatorId },
				})
			).data,
		enabled: !!curatorId,
		// Read fresh each time the dialog opens: what was seen is what is paid to.
		staleTime: 0,
		gcTime: 0,
	});

export type MarkPaidBody = {
	curatorId: string;
	month: string;
	paidOn: string;
	reference: string;
	detailsSeenAt: string;
};

export const useMarkPayoutPaid = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (body: MarkPaidBody) =>
			(await axios.post<{ amount: number }>(ADMIN_URL, body)).data,
		// Refetched whichever way it went: a refusal can mean another admin paid it.
		onSettled: () => queryClient.invalidateQueries({ queryKey: ADMIN }),
	});
};

/** The payout the month already has: another admin, or a second click, got there first. */
export type PaidPayout = {
	paidOn: string;
	reference: string;
	paidBy: string | null;
};

/** Why the server refused to mark a month paid, when the dialog has something to show for it. */
export const payoutRefusal = (
	error: unknown,
):
	| { error: "alreadyPaid"; paid: PaidPayout | null }
	| { error: "detailsChanged" }
	| null => {
	if (!axios.isAxiosError(error) || error.response?.status !== 409) return null;
	const body = error.response.data as
		| { error?: string; details?: { paid?: PaidPayout | null } }
		| undefined;
	if (body?.error === "alreadyPaid") {
		return { error: "alreadyPaid", paid: body.details?.paid ?? null };
	}
	if (body?.error === "detailsChanged") return { error: "detailsChanged" };
	return null;
};

export const useSavePayoutNote = (payoutId: string) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (note: string) =>
			(
				await axios.patch<{ note: string | null }>(`${ADMIN_URL}/${payoutId}`, {
					note,
				})
			).data,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN }),
	});
};

export const useCuratorEarnings = () =>
	useQuery({
		queryKey: ["advisor", "earnings"],
		queryFn: async () =>
			(await axios.get<CuratorEarningsDto>("/api/advisor/earnings")).data,
	});

const PAID_WORK = ["advisor", "paid-work"];

export const usePaidWork = () =>
	useQuery({
		queryKey: PAID_WORK,
		queryFn: async () =>
			(await axios.get<PaidWorkDto>("/api/advisor/paid-work")).data,
	});

export type PaidWorkBody = {
	holder: string;
	account?: string;
	invoicing: ExpertInvoicing;
	legal?: LegalAcceptanceInput[];
};

/** A first save sent no account, and none is saved. */
export const isAccountRequired = (error: unknown) =>
	axios.isAxiosError(error) &&
	error.response?.status === 400 &&
	error.response.data?.error === "accountRequired";

export const useSavePaidWork = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (body: PaidWorkBody) =>
			(await axios.put<PaidWorkDto>("/api/advisor/paid-work", body)).data,
		onSuccess: (saved) => {
			queryClient.setQueryData(PAID_WORK, saved);
			return queryClient.invalidateQueries({
				queryKey: ["advisor", "earnings"],
			});
		},
	});
};

export const useInvoicingLabels = (): Record<ExpertInvoicing, string> => {
	const { t } = useTranslate();

	return {
		SelfEmployed: t("admin.payouts.invoicing.selfEmployed", "Self-employed"),
		Company: t("admin.payouts.invoicing.company", "Company"),
		SelfBilling: t("admin.payouts.invoicing.selfBilling", "Self-billing"),
	};
};

/**
 * Why a curator's fee is what it is, or why there is none. `viewer` only changes
 * the curator's own stop: "You stopped" to them, "Stopped" to an admin.
 */
export const useFeeReasonLabel = (viewer: "admin" | "curator") => {
	const { t } = useTranslate();

	return (reason: CheckpointFeeReason | NoFeeReason, parts = 0) => {
		switch (reason) {
			case CheckpointFeeReason.Full:
				return t("checkpoints.fee.reason.full", "Full fee");
			case CheckpointFeeReason.RefundReduced:
				return t("checkpoints.fee.reason.refundReduced", "Reduced by a refund");
			case CheckpointFeeReason.Replacement:
				return t(
					"checkpoints.fee.reason.replacement",
					"Took over · {parts} of {total} parts",
					{ parts, total: CHECKPOINT_PARTS.Human },
				);
			case "adminVerdict":
				return t(
					"checkpoints.fee.reason.adminVerdict",
					"Verdict written by an admin — no fee",
				);
			case "stopped":
				return viewer === "curator"
					? t("checkpoints.fee.reason.stoppedCurator", "You stopped — no fee")
					: t("checkpoints.fee.reason.stopped", "Stopped — no fee");
		}
	};
};
