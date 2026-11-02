import { cache } from "react";
import {
	roleAtLeast,
	SpaceRole,
	strongestRole,
} from "@/config/permissions/roles";
import { SPACES, type SpaceType } from "@/config/spaces";
import { permissionsOf } from "@/config/spaces/define-space";
import { onTheStand } from "@/lib/stand";
import { SPACE_ADAPTERS } from "./adapters";
import { customRolePermissions } from "./custom-roles";
import { type PermissionState, permissionsForRole } from "./matrix-source";
import {
	type StoredMembership,
	storedMembership,
	storedRole,
} from "./stored-role";
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
 * anything (docs/roles-and-permissions-plan.md, phase 2).
 *
 * Enforcing is the default: forgetting to flip a flag must fail closed.
 */
export const isEnforcing = (): boolean => process.env.RBAC_ENFORCE !== "false";

/**
 * Where a membership's permissions come from.
 *
 * A custom role narrows its base role, so it only applies while nothing else
 * gives the user more: a hub admin who also holds a `marketer` membership in the
 * admin space keeps the admin permissions they inherit. An equal role from
 * another source loses to the custom one — the explicit assignment is the more
 * recent decision about that person.
 *
 * A key that resolves to nothing grants nothing: the role was deleted, and
 * falling back to the broader base role would be a silent promotion.
 */
const grantedPermissions = async ({
	type,
	spaceId,
	role,
	membership,
}: {
	type: SpaceType;
	spaceId: string;
	role: SpaceRole;
	membership: StoredMembership | null;
}): Promise<Map<string, PermissionState>> => {
	const custom = membership?.customRoleKey;

	if (!custom || membership?.role !== role) {
		return permissionsForRole(type, role);
	}

	const permissions = await customRolePermissions(type, spaceId, custom);

	return new Map(
		(permissions ?? []).map((permission) => [
			permission,
			{ allowed: true, scope: null },
		]),
	);
};

/** The hub role is also the platform role, so it is resolved on its own. */
const resolveHubRole = async (
	user: NonNullable<MaybeAccessUser>,
): Promise<SpaceRole | null> => {
	const [stored, resolved] = await Promise.all([
		storedRole("hub", DEFAULT_SPACE_ID, user.id),
		SPACE_ADAPTERS.hub?.resolve?.(DEFAULT_SPACE_ID, user),
	]);

	return strongestRole([stored, resolved?.role]);
};

const inheritedRoleFor = async (
	inherit: (typeof SPACES)[SpaceType]["inheritRoleFrom"],
	user: NonNullable<MaybeAccessUser>,
): Promise<SpaceRole | null> => {
	if (inherit?.space !== "hub") return null;

	const hubRole = await resolveHubRole(user);

	return hubRole && roleAtLeast(hubRole, inherit.atLeast) ? hubRole : null;
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
async function resolveSpaceAccess(
	type: SpaceType,
	param: string | null,
	user: MaybeAccessUser,
): Promise<SpaceAccess> {
	const space = SPACES[type];
	const fallbackId = param ?? DEFAULT_SPACE_ID;

	if (!space || !user) return noAccess(type, fallbackId);

	// The dev space does not exist in production, whoever asks.
	if (
		type === "dev" &&
		process.env.NODE_ENV === "production" &&
		!onTheStand()
	) {
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
	//
	// Membership is the source of truth; the adapter is what is left of the old
	// domain-table checks and disappears once the backfill has run everywhere.
	const [membership, inheritedRole] = await Promise.all([
		storedMembership(type, spaceId, user.id),
		inheritedRoleFor(space.inheritRoleFrom, user),
	]);

	const role = strongestRole([
		membership?.role ?? null,
		resolved?.role,
		inheritedRole,
	]);

	if (!role) return noAccess(type, spaceId);

	const [granted, revoked] = await Promise.all([
		grantedPermissions({ type, spaceId, role, membership }),
		adapter?.revoked ? adapter.revoked(spaceId, user) : [],
	]);

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

/** One resolution per server render: layout, gate and page share the answer. */
export const getSpaceAccess = cache(resolveSpaceAccess);

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

/**
 * Platform staff: `admin` or above in the hub.
 *
 * For the handful of rules that are about seniority rather than about a feature
 * — a paywall staff are not subject to, a product rule they sit outside of.
 * Anything that guards a feature belongs in the matrix instead, as a permission.
 */
export const isStaff = (access: SpaceAccess): boolean =>
	access.role !== "none" && roleAtLeast(access.role, SpaceRole.Admin);
