/** The way into a checkpoint: the hub, which sends a signed-out visitor to sign in first. */
export const CHECKPOINT_ENTRY_HREF = "/checkpoint/new";

/** The landing FAQ item the "AI can make mistakes" line opens (GDHUB-142). */
export const AI_ACCURACY_ANCHOR = "faq-ai-accuracy";
export const AI_ACCURACY_HREF = `/checkpoint#${AI_ACCURACY_ANCHOR}`;

/** `/registration?intent=checkpoint`: sign-up lands on the hub instead of onboarding. */
export const CHECKPOINT_INTENT = "checkpoint";

export const isCheckpointEntry = (pathname: string) =>
	pathname === CHECKPOINT_ENTRY_HREF ||
	pathname.startsWith(`${CHECKPOINT_ENTRY_HREF}/`);

/** Where an unfinished onboarding may go: the checkpoint hub's "About you" finishes it too. */
export const skipsOnboarding = (pathname: string) =>
	pathname.startsWith("/registration/onboarding") ||
	isCheckpointEntry(pathname);

/** `?project=` carries the project the way in was opened for, from the workflow or a review. */
const withProject = (href: string, slug?: string | null) =>
	slug ? `${href}?${new URLSearchParams({ project: slug }).toString()}` : href;

export const entryHubHref = (slug?: string | null) =>
	withProject(CHECKPOINT_ENTRY_HREF, slug);
export const entryAboutHref = (slug?: string | null) =>
	withProject(`${CHECKPOINT_ENTRY_HREF}/about`, slug);
export const entryProjectHref = (slug?: string | null) =>
	withProject(`${CHECKPOINT_ENTRY_HREF}/project`, slug);

/** Sign-up for the checkpoint entry, keeping the project it was opened for. */
export const entryRegistrationHref = (slug?: string | null) => {
	const query = new URLSearchParams({ intent: CHECKPOINT_INTENT });
	if (slug) query.set("project", slug);
	return `/registration?${query.toString()}`;
};

/**
 * The purchase wizard for one project. The project rides in the query, not the
 * path, so a slug can never collide with the hub's own pages (`about`, `project`).
 */
export const checkoutHref = (slug: string, step?: string) => {
	const query = new URLSearchParams({ project: slug });
	if (step) query.set("step", step);
	return `${CHECKPOINT_ENTRY_HREF}/checkout?${query.toString()}`;
};

/** A page's search param, if it is a single non-empty string. */
export const searchParam = (value: string | string[] | undefined) =>
	typeof value === "string" && value ? value : undefined;
