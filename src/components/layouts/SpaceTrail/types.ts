/** The kinds of space the switcher lists. Admin is deliberately not one. */
export type SpaceKind = "project" | "event" | "course";

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
	/**
	 * Which space is open, so the switcher can mark it. Absent for spaces that
	 * are not the user's own — admin has a trail but no entry in the menu.
	 */
	space?: { kind: SpaceKind; id: string };
};
