import { SpaceRole } from "@/config/permissions/roles";
import { defineSpace } from "./define-space";

/**
 * Platform administration. Has no membership of its own yet: it is run by staff
 * from the hub. Explicit `SpaceMember(admin, …)` rows start overriding that once
 * narrow roles appear — marketer, HR (docs/roles-and-permissions.md §5.6).
 */
export const adminSpace = defineSpace({
	type: "admin",
	features: {
		users: ["view", "manage"],
		// The permission matrix itself. `manage` is the most dangerous permission
		// on the platform: it is the one that can take permissions away.
		roles: ["view", "manage"],
		posts: ["view", "manage"],
		devlog_posts: ["view", "manage"],
		// The whole catalogue, including drafts. Note this is not a role inside
		// any event: staff moderate the listing, they do not join the space (§3.1).
		events: ["view", "manage"],
		projects: ["view", "manage"],
		// Scout cabinets: who may scout, and the card they scout under.
		scouts: ["view", "manage"],
		// Workflow from the platform side: the template library and editing any
		// project's process. Not to be confused with `project.workflow` (§3.4).
		workflow: ["view", "manage"],
		// Checkpoint promotion codes, kept in Stripe; `manage` creates and turns them off.
		checkpoints: ["view", "manage"],
		audit_logs: ["view"],
		// The content-view report. Read-only by nature: there is nothing here to
		// manage, only numbers the platform already counted.
		views: ["view"],
	},
	inheritRoleFrom: { space: "hub", atLeast: SpaceRole.Admin },
});
