import { SpaceRole } from "@/config/permissions/roles";
import type { SpaceAccess } from "@/services/access/types";

/** Only the project's own people count as having seen a candidate; a platform admin looking in does not. */
export const seenByTheProject = (
	access: Pick<SpaceAccess, "role" | "viaSuperAdmin">,
) =>
	!access.viaSuperAdmin &&
	(access.role === SpaceRole.Owner || access.role === SpaceRole.Admin);
