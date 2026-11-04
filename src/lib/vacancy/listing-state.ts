import { PaymentStatus, TeamVacancyStatus } from "@/config/prisma-enums";

/** What the admin reads about a position's listing fee (GDHUB-127, frame 10.19). */
export const LISTING_STATES = [
	"free",
	"paid",
	"pending",
	"failed",
	"cancelled",
	"refunded",
	"disputed",
] as const;
export type ListingState = (typeof LISTING_STATES)[number];

const FROM_PAYMENT: Record<PaymentStatus, ListingState> = {
	[PaymentStatus.PENDING]: "pending",
	[PaymentStatus.PROCESSING]: "pending",
	[PaymentStatus.COMPLETED]: "paid",
	[PaymentStatus.FAILED]: "failed",
	[PaymentStatus.CANCELED]: "cancelled",
	[PaymentStatus.REFUNDED]: "refunded",
	[PaymentStatus.PARTIALLY_REFUNDED]: "refunded",
	[PaymentStatus.DISPUTED]: "disputed",
};

/** The latest payment decides; a position that never had one is free. */
export const listingStateOf = (latest: PaymentStatus | null | undefined) =>
	latest ? FROM_PAYMENT[latest] : ("free" as const);

/** Where a position stands for the admin: a published one past its date is expired. */
export const POSITION_STATES = [
	"draft",
	"published",
	"expired",
	"closed",
] as const;
export type PositionState = (typeof POSITION_STATES)[number];

export const positionStateOf = (
	vacancy: { status: TeamVacancyStatus; finishedAt: Date },
	now = new Date(),
): PositionState => {
	if (vacancy.status === TeamVacancyStatus.Draft) return "draft";
	if (vacancy.status === TeamVacancyStatus.Closed) return "closed";
	return vacancy.finishedAt < now ? "expired" : "published";
};
