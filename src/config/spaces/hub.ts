import { SpaceRole } from "@/config/permissions/roles";
import { defineSpace } from "./define-space";

/**
 * The community space every authenticated user belongs to. Its role doubles as
 * the platform role: `hub.admin` is staff and gets `admin` in every other space
 * (docs/roles-and-permissions.md §2, invariant 5).
 *
 * The hub has neither `info` nor `lifecycle`: there is nothing to rename,
 * publish or delete.
 */
export const hubSpace = defineSpace({
	type: "hub",
	features: {
		talent_pool: ["view", "contact"],
		projects: ["view", "create"],
		events: ["view", "create"],
		courses: ["view", "create"],
		jobs: ["view", "apply"],
		experts: ["view", "request"],
		chat: ["use"],
		live_room: ["use", "manage"],
	},
	overrides: {
		// A guest is a registered user who has not finished onboarding: showcases
		// are open, people and any kind of participation are not.
		[SpaceRole.Guest]: [
			"hub.projects.view",
			"hub.events.view",
			"hub.courses.view",
			"hub.jobs.view",
			"hub.experts.view",
		],
		// Preview feature: the action class would hand it to every member, but the
		// live room is not rolled out yet (§3.7).
		[SpaceRole.Member]: { "hub.live_room.use": false },
	},
});
