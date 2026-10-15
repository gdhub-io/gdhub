/** The way into a checkpoint: the hub, which sends a signed-out visitor to sign in first. */
export const CHECKPOINT_ENTRY_HREF = "/checkpoint/new";
export const CHECKPOINT_CTA_HREF = CHECKPOINT_ENTRY_HREF;

/** `/registration?intent=checkpoint`: sign-up lands on the hub instead of onboarding. */
export const CHECKPOINT_INTENT = "checkpoint";

/**
 * The purchase wizard for one project. The project rides in the query, not the
 * path, so a slug can never collide with the hub's own pages (`about`, `project`).
 */
export const checkoutHref = (slug: string, step?: string) => {
	const query = new URLSearchParams({ project: slug });
	if (step) query.set("step", step);
	return `${CHECKPOINT_ENTRY_HREF}/checkout?${query.toString()}`;
};
