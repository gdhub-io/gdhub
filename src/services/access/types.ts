import type { User } from "@gdhub-io/gdhub-prisma";
import type { SpaceRole } from "@/config/permissions/roles";
import type { Permission, SpaceType } from "@/config/spaces";

/** Fixed id of the single instance of hub / admin / dev. */
export const DEFAULT_SPACE_ID = "default";

/**
 * What the resolver needs from the session — a narrowing of the Prisma `User`
 * rather than a hand-written copy, so a renamed column breaks the build here.
 *
 * The fields are optional because a JWT issued before the field existed simply
 * does not carry it.
 */
export type AccessUser = Partial<
	Pick<User, "roles" | "onboardingDone" | "isSuperAdmin">
> &
	Pick<User, "id">;

/** `null` means "no session at all". */
export type MaybeAccessUser = AccessUser | null;

/** Resolved access of one user to one space instance. */
export type SpaceAccess = {
	type: SpaceType;
	id: string;
	role: SpaceRole | "none";
	permissions: ReadonlySet<string>;
	scopes: ReadonlyMap<string, "own">;
	/** True when access was granted by the super-admin bypass. */
	viaSuperAdmin: boolean;
};

/** What an adapter learned about the space in one lookup. */
export type ResolvedSpace = {
	/** Canonical entity id — what membership rows will store. */
	spaceId: string;
	/** Role from the domain tables, or `null` when the user has none. */
	role: SpaceRole | null;
};

/**
 * Everything a space knows that the permission config cannot: how a route
 * parameter maps to an entity, what role the domain tables give, and what the
 * entity's state takes away.
 *
 * Optional by design — a space whose membership lives entirely in `SpaceMember`
 * and which has no revoking states needs no adapter at all.
 *
 * See docs/roles-and-permissions.md §4.2.
 */
export type SpaceAdapter = {
	/**
	 * Resolves the route parameter (slug or id) to the canonical id and the role
	 * in a single query — the space gate runs on every page of the space, so this
	 * is deliberately one round-trip, not two.
	 *
	 * Returns `null` when the entity does not exist.
	 *
	 * Temporary in this shape: after the backfill the role comes from
	 * `SpaceMember` and only the id lookup stays.
	 */
	resolve?: (param: string, user: AccessUser) => Promise<ResolvedSpace | null>;
	/**
	 * Permissions the entity's current state takes away, as exact strings or
	 * `*.action` patterns. State may only revoke, never grant.
	 */
	revoked?: (spaceId: string) => Promise<string[]>;
};

/** `*.edit` matches any permission ending in `.edit`. */
export const matchesPattern = (
	permission: string,
	pattern: string,
): boolean => {
	if (pattern === permission) return true;
	if (!pattern.startsWith("*.")) return false;

	return permission.endsWith(pattern.slice(1));
};

export type { Permission, SpaceType };
