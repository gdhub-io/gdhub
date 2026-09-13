import { SpaceRole } from "@/config/permissions/roles";
import { defineSpace } from "./define-space";

/**
 * Project space: the team works here. Applying for a vacancy happens outside —
 * on the public page and in the hub (docs/roles-and-permissions.md §2.2).
 */
export const projectSpace = defineSpace({
	type: "project",
	features: {
		info: ["view", "edit"],
		lifecycle: ["archive", "delete"],
		members: ["view", "invite", "remove"],
		artifacts: ["view", "manage"],
		checkpoints: ["view", "create", "manage"],
		workflow: ["view", "edit"],
		vacancies: ["view", "manage", "review"],
		equity: ["view", "manage"],
		devlog: ["view", "create", "publish"],
	},
	overrides: {
		// Guests exist only by explicit invitation and only observe (§2.2).
		[SpaceRole.Guest]: ["project.info.view", "project.devlog.view"],
		[SpaceRole.Member]: {
			// A team member sees their own shares, not the whole cap table.
			"project.equity.view": "own",
			// Starting a checkpoint spends money and commits the whole team to a
			// deadline, so it sits with the owner and the admins even though
			// `create` is a read-class action everywhere else.
			"project.checkpoints.create": false,
		},
	},
});
