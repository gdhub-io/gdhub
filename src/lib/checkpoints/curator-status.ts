/** Where an expert's offer to curate stands. Browser-safe. */
export type CuratorStatus = "pending" | "approved" | "notApproved";

/** Null when the expert never asked; a decline and a revoke both read "not approved". */
export const curatorStatusOf = (profile: {
	curatorRequestedAt: Date | string | null;
	curatorApprovedAt: Date | string | null;
	curatorReviewNote: string | null;
}): CuratorStatus | null => {
	if (profile.curatorApprovedAt) return "approved";
	if (profile.curatorReviewNote) return "notApproved";
	return profile.curatorRequestedAt ? "pending" : null;
};
