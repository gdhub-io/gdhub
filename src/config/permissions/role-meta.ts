import { SpaceRole } from "./roles";

/**
 * How the four base roles are described in the admin UI. Kept next to the roles
 * themselves rather than in the page: the same wording belongs in an invitation
 * form later, and it must not drift between the two.
 *
 * See docs/roles-and-permissions.md §2.
 */
export const ROLE_META: Record<SpaceRole, { title: string; hint: string }> = {
	[SpaceRole.Owner]: {
		title: "Owner",
		hint: "Created the space and owns it fully. The only role that can archive and delete it",
	},
	[SpaceRole.Admin]: {
		title: "Administrator",
		hint: "Runs the space without owning it. hub · admin gets this role in every space",
	},
	[SpaceRole.Member]: {
		title: "Member",
		hint: "Joined the space: hired into the team, approved for the event, enrolled in the course",
	},
	[SpaceRole.Guest]: {
		title: "Guest",
		hint: "Observer by explicit invitation. Reads the showcase part and does not participate",
	},
};

/** `devlog_posts` → `Devlog posts`. */
export const humanizeFeature = (feature: string): string => {
	const words = feature.replace(/_/g, " ");

	return words.charAt(0).toUpperCase() + words.slice(1);
};
