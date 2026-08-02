import { SpaceRole } from "@/config/permissions/roles";
import { defineSpace } from "./define-space";

/**
 * Event space: organisers and approved participants. Applying to an event is
 * done from the public page, `members.manage` is the moderation of those
 * applications (docs/roles-and-permissions.md §2.2).
 */
export const eventSpace = defineSpace({
	type: "event",
	features: {
		info: ["view", "edit"],
		lifecycle: ["publish", "archive", "delete"],
		members: ["view", "manage"],
		content: ["view", "edit"],
		schedule: ["view", "edit"],
		certificates: ["view", "issue"],
	},
	overrides: {
		[SpaceRole.Guest]: ["event.info.view", "event.schedule.view"],
	},
});
