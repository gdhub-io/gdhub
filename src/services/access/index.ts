import {
	roleAtLeast,
	SpaceRole,
	strongestRole,
} from "@/config/permissions/roles";
import { SPACES, type SpaceType } from "@/config/spaces";
import { permissionsOf } from "@/config/spaces/define-space";
import { SPACE_ADAPTERS } from "./adapters";
import { permissionsForRole } from "./matrix-source";
import {
	DEFAULT_SPACE_ID,
	type MaybeAccessUser,
	matchesPattern,
	type SpaceAccess,
} from "./types";

export type {
	AccessUser,
	MaybeAccessUser,
	SpaceAccess,
	SpaceAdapter,
} from "./types";
export { DEFAULT_SPACE_ID } from "./types";

const noAccess = (type: SpaceType, id: string): SpaceAccess => ({
	type,
	id,
	role: "none",
	permissions: new Set(),
	scopes: new Map(),
	viaSuperAdmin: false,
});

/**
 * Shadow mode. With `RBAC_ENFORCE=false` a denial is logged but not applied —
 * used to watch a week of production traffic before permissions start blocking
 * anything (docs/roles-and-permissions-plan.md, фаза 2).
 *
 * Enforcing is the default: forgetting to flip a flag must fail closed.
 */
export const isEnforcing = (): boolean => process.env.RBAC_ENFORCE !== "false";

/** The hub role is also the platform role, so it is resolved on its own. */
const resolveHubRole = async (
	user: NonNullable<MaybeAccessUser>,
): Promise<SpaceRole | null> => {
	const resolved = await SPACE_ADAPTERS.hub?.resolve?.(DEFAULT_SPACE_ID, user);

	return resolved?.role ?? null;
};

/**
 * Resolves who the user is inside one space instance and what they may do.
 *
 * Order (docs/roles-and-permissions.md §6):
 *  0. super-admin bypasses everything;
 *  1. the route parameter becomes a canonical id;
 *  2. role = strongest of (domain role, inherited role, platform staff);
 *  3. permissions come from the matrix for that role;
 *  4. the entity's state takes permissions away.
 */
export async function getSpaceAccess(
	type: SpaceType,
	param: string | null,
	user: MaybeAccessUser,
): Promise<SpaceAccess> {
	const space = SPACES[type];
	const fallbackId = param ?? DEFAULT_SPACE_ID;

	if (!space || !user) return noAccess(type, fallbackId);

	// The dev space does not exist in production, whoever asks.
	if (type === "dev" && process.env.NODE_ENV === "production") {
		return noAccess(type, fallbackId);
	}

	if (user.isSuperAdmin) {
		const all = permissionsOf(space);

		return {
			type,
			id: fallbackId,
			role: SpaceRole.Owner,
			permissions: new Set(all),
			scopes: new Map(),
			viaSuperAdmin: true,
		};
	}

	const adapter = SPACE_ADAPTERS[type];
	const resolved = adapter?.resolve
		? await adapter.resolve(param ?? DEFAULT_SPACE_ID, user)
		: null;

	// The adapter looked and found nothing: the entity does not exist.
	if (adapter?.resolve && !resolved) return noAccess(type, fallbackId);

	const spaceId = resolved?.spaceId ?? fallbackId;

	// A space may take its role from another one: `admin` and `dev` are run by
	// platform staff from the hub.
	//
	// Note what is deliberately absent: being staff does NOT grant a role in a
	// project, event or course. Administering the platform and taking part in
	// someone's project are different things, and the only identity that crosses
	// that line is the super-admin — on purpose, loudly, and with an audit entry.
	const inherit = space.inheritRoleFrom;
	const inheritedRole: SpaceRole | null = inherit
		? await (async () => {
				const hubRole =
					inherit.space === "hub" ? await resolveHubRole(user) : null;

				return hubRole && roleAtLeast(hubRole, inherit.atLeast)
					? hubRole
					: null;
			})()
		: null;

	const role = strongestRole([resolved?.role, inheritedRole]);

	if (!role) return noAccess(type, spaceId);

	const granted = await permissionsForRole(type, role);
	const revoked = adapter?.revoked ? await adapter.revoked(spaceId) : [];

	const permissions = new Set<string>();
	const scopes = new Map<string, "own">();

	for (const [permission, state] of granted) {
		if (revoked.some((pattern) => matchesPattern(permission, pattern)))
			continue;

		permissions.add(permission);
		if (state.scope === "own") scopes.set(permission, "own");
	}

	return { type, id: spaceId, role, permissions, scopes, viaSuperAdmin: false };
}

/**
 * The only place permissions are checked. In shadow mode a denial is logged and
 * allowed through, so switching enforcement on is a configuration change rather
 * than a deploy.
 */
export function can(access: SpaceAccess, permission: string): boolean {
	if (access.permissions.has(permission)) return true;

	if (!isEnforcing()) {
		console.warn(
			`[rbac] would deny ${permission} (space=${access.type}:${access.id}, role=${access.role})`,
		);
		return true;
	}

	return false;
}

/** `"own"` when the permission is limited to the user's own records. */
export const scopeOf = (
	access: SpaceAccess,
	permission: string,
): "own" | null => access.scopes.get(permission) ?? null;

/** True when the user may enter the space at all — any role beats `none`. */
export const canEnter = (access: SpaceAccess): boolean =>
	access.role !== "none";
