import { SpaceRole } from "@/config/permissions/roles";
import { defineSpace } from "./define-space";

/**
 * Course space: the author, teachers (admins of this space) and enrolled
 * students. Enrolment happens outside the space.
 */
export const courseSpace = defineSpace({
	type: "course",
	features: {
		info: ["view", "edit"],
		lifecycle: ["publish", "delete"],
		curriculum: ["view", "edit"],
		classroom: ["access", "teach"],
		students: ["view", "manage"],
		groups: ["view", "manage"],
		content: ["view", "edit"],
		certificates: ["view", "issue"],
	},
	overrides: {
		[SpaceRole.Guest]: ["course.info.view", "course.curriculum.view"],
	},
});
