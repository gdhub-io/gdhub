import type { SpaceRole } from "@/config/permissions/roles";
import type { SpaceType } from "@/config/spaces";
import type { SpaceAccess } from "./types";

/**
 * Serialisable form of `SpaceAccess` for the client boundary: `Set` and `Map`
 * do not survive the trip from a server component to a client one.
 */
export type SpaceAccessSnapshot = {
	type: SpaceType;
	id: string;
	role: SpaceRole | "none";
	permissions: string[];
	scopes: Record<string, "own">;
};

export const toSnapshot = (access: SpaceAccess): SpaceAccessSnapshot => ({
	type: access.type,
	id: access.id,
	role: access.role,
	permissions: [...access.permissions],
	scopes: Object.fromEntries(access.scopes) as Record<string, "own">,
});
