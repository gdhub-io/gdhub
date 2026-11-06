/**
 * Where the switcher can take you. Hub, advisor and scout are single spaces;
 * projects and events come in many. Admin is deliberately not one.
 */
export type SpaceKind = "hub" | "advisor" | "scout" | "project" | "event";

/** The open space, so the switcher can mark it. `id` only for the many-kinds. */
export type CurrentSpace = { kind: SpaceKind; id?: string };

/**
 * The trail after the logo: where this space sits, and what it is.
 *
 * Not antd `Breadcrumb` items any more. The crumbs are hoverable chips, only
 * the last two are separated, and the final one is a menu button — none of
 * which a list of rendered titles can express, and all of which the header has
 * to know about to lay out.
 */
export type SpaceTrailConfig = {
	/** The hub list this space belongs to. Omitted when no such page exists. */
	parent?: { href: string; label: string };
	/** The space itself: the page title and the switcher's trigger. */
	current: { label: string };
	space?: CurrentSpace;
	/**
	 * Admin only: a platform space, not the person's, so its last crumb is a
	 * plain name — a switcher without it in would lie about where you are.
	 */
	noSwitcher?: true;
};
