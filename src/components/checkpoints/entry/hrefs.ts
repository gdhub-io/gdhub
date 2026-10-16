export const ENTRY_HUB_HREF = "/checkpoint/new";
export const ENTRY_ABOUT_HREF = "/checkpoint/new/about";
export const ENTRY_PROJECT_HREF = "/checkpoint/new/project";

/** `?project=` carries the project the way in was opened for, from the workflow or a review. */
const withProject = (href: string, slug?: string | null) =>
	slug ? `${href}?${new URLSearchParams({ project: slug }).toString()}` : href;

export const entryHubHref = (slug?: string | null) =>
	withProject(ENTRY_HUB_HREF, slug);
export const entryAboutHref = (slug?: string | null) =>
	withProject(ENTRY_ABOUT_HREF, slug);
export const entryProjectHref = (slug?: string | null) =>
	withProject(ENTRY_PROJECT_HREF, slug);

/** The one `project` value of a page's search params, if it is a single string. */
export const projectParam = (value: string | string[] | undefined) =>
	typeof value === "string" && value ? value : undefined;
