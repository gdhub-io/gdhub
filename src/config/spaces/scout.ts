import { defineSpace } from "./define-space";

/**
 * The scout cabinet: where investors, publishers and angels watch the projects
 * being built on the platform.
 *
 * No `inheritRoleFrom`. Administering the platform and scouting for deals are
 * different jobs, so staff do not walk in by being staff — a scout gets an
 * explicit `SpaceMember(scout, default, …)` row, granted from the admin users
 * page today and, later, by a subscription creating the same row.
 *
 * Single-instance, like the hub: every scout works in the same cabinet space and
 * sees their own settings and deals inside it.
 */
export const scoutSpace = defineSpace({
	type: "scout",
	features: {
		// The projects on the platform, seen through the scout's focus.
		games: ["view"],
		// The pipeline: a project a scout is talking to, and the offer on it.
		deals: ["view", "create", "manage"],
		// Colleagues invited into the same cabinet.
		team: ["view", "invite", "remove"],
		// The cabinet itself: focus, alerts, the public scout card.
		settings: ["view", "manage"],
	},
});
