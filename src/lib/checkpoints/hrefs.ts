import { FINAL_SESSION } from "@/config/checkpoint";

/** The `?sprint=` value a session opens on: its sprint, the last one the verdict. */
export const sprintParam = (index: number) =>
	index >= FINAL_SESSION ? "verdict" : String(index);

/** The session a `?sprint=` value names; undefined for none or a wrong one. */
export const sessionOfSprintParam = (value: string | undefined) => {
	if (value === "verdict") return FINAL_SESSION;
	const index = Number(value);
	return Number.isInteger(index) && index >= 1 && index < FINAL_SESSION
		? index
		: undefined;
};

/** The tabs a link can open on. */
export const PATH_TABS = [
	"sprint",
	"review",
	"plan",
	"brief",
	"transcript",
	"calendar",
] as const;
export type PathTab = (typeof PATH_TABS)[number];

export const pathTabOf = (value: string | undefined): PathTab | undefined =>
	PATH_TABS.find((tab) => tab === value);

/**
 * Path to Checkpoint N (GDHUB-117): everything of one checkpoint's work on one
 * page, opened on a sprint — or, without one, on the sprint under way — and,
 * when asked, on a tab.
 */
export const checkpointPathHref = (
	slug: string,
	number: number,
	index?: number,
	tab?: PathTab,
) => {
	const query = new URLSearchParams();
	if (index) query.set("sprint", sprintParam(index));
	if (tab) query.set("tab", tab);
	const search = query.toString();
	return `/user/project/${slug}/workflow/cp${number}${search ? `?${search}` : ""}`;
};

export const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "";

/** Path to Checkpoint for the team, opened on the sprint a session opens. */
export const reviewUrl = (
	slug: string,
	number: number,
	index: number,
	tab?: PathTab,
) => `${appUrl()}${checkpointPathHref(slug, number, index, tab)}`;
