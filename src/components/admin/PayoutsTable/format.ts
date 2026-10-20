"use client";

import { useTranslate } from "@tolgee/react";
import {
	CHECKPOINT_MINOR_UNITS,
	CHECKPOINT_PRICE_CURRENCY,
} from "@/config/checkpoint";
import type { ExpertInvoicing } from "@/config/prisma-enums";

/** A payout or a fee always shows its cents: it is what goes into the bank form. */
export const formatPayoutMoney = (minor: number) =>
	`${CHECKPOINT_PRICE_CURRENCY}${(
		minor / CHECKPOINT_MINOR_UNITS
	).toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;

export const useInvoicingLabels = (): Record<ExpertInvoicing, string> => {
	const { t } = useTranslate();

	return {
		SelfEmployed: t("admin.payouts.invoicing.selfEmployed", "Self-employed"),
		Company: t("admin.payouts.invoicing.company", "Company"),
		SelfBilling: t("admin.payouts.invoicing.selfBilling", "Self-billing"),
	};
};

/** "Anna Petrova" → "Anna", for the lines that address the curator. */
export const firstName = (name: string | null) => name?.split(" ")[0] ?? "";
