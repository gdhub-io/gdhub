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
		// Buying a checkpoint spends money and puts the whole team under a
		// deadline, and the goal card it is judged against is the author's
		// statement of intent. Both stay with the owner — not with the admins,
		// who manage everything else here.
		[SpaceRole.Admin]: {
			"project.checkpoints.create": false,
			"project.checkpoints.manage": false,
		},
		[SpaceRole.Member]: {
			// A team member sees their own shares, not the whole cap table.
			"project.equity.view": "own",
			"project.checkpoints.create": false,
		},
	},
});
