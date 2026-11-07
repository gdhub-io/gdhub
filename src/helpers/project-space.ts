/**
 * Where the project space opens. Links point at the tab itself: the bare
 * `/user/project/<slug>` only redirects here, a server round trip per click.
 */
export const projectSpaceHref = (slug: string) =>
	`/user/project/${slug}/workflow`;
