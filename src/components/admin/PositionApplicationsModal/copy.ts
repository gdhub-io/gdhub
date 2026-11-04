import type { StatusTone } from "@/components/ui";
import type { ListingState, PositionState } from "@/lib/vacancy/listing-state";

export const POSITION_LABEL: Record<PositionState, string> = {
	draft: "Draft",
	published: "Published",
	expired: "Expired",
	closed: "Closed",
};

export const POSITION_TONE: Record<PositionState, StatusTone> = {
	draft: "neutral",
	published: "success",
	expired: "warning",
	closed: "neutral",
};

export const LISTING_LABEL: Record<ListingState, string> = {
	free: "Free",
	paid: "Paid",
	pending: "Pending",
	failed: "Failed",
	cancelled: "Cancelled",
	refunded: "Refunded",
	disputed: "Disputed",
};

/** A failed charge is the one that needs a person; a refund is worth a second look. */
export const LISTING_TONE: Record<ListingState, StatusTone> = {
	free: "neutral",
	paid: "success",
	pending: "info",
	failed: "danger",
	cancelled: "neutral",
	refunded: "warning",
	disputed: "danger",
};

/** The listing fee as charged, in its own currency; amounts are minor units. */
export const formatFee = (fee: { amount: number; currency: string }) =>
	new Intl.NumberFormat("en", {
		style: "currency",
		currency: fee.currency,
		maximumFractionDigits: 0,
	}).format(fee.amount / 100);
