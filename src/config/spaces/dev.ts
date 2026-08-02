import { SpaceRole } from "@/config/permissions/roles";
import { defineSpace } from "./define-space";

/**
 * Development tools. Gated by the environment before any role check — in
 * production the space does not exist at all.
 */
export const devSpace = defineSpace({
	type: "dev",
	features: {
		tools: ["use"],
	},
	inheritRoleFrom: { space: "hub", atLeast: SpaceRole.Admin },
});
