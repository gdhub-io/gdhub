import { SpaceRole } from "@/config/prisma-enums";

/**
 * Role of a user inside one space instance. `none` is not a role — it is the
 * absence of one, and the space gate turns it into a 404.
 *
 * The values come straight from the Prisma enum (via the browser-safe mirror),
 * so nothing has to be translated on the way to the database.
 *
 * See docs/roles-and-permissions.md §2.
 */
export { SpaceRole };

export const SPACE_ROLES = [
	SpaceRole.Owner,
	SpaceRole.Admin,
	SpaceRole.Member,
	SpaceRole.Guest,
] as const;

/** Strongest first. Used when several sources give a user different roles. */
export const ROLE_SENIORITY: readonly SpaceRole[] = SPACE_ROLES;

/** Returns the strongest of the given roles, or `null` when there is none. */
export const strongestRole = (
	roles: readonly (SpaceRole | null | undefined)[],
): SpaceRole | null =>
	ROLE_SENIORITY.find((candidate) => roles.includes(candidate)) ?? null;

/** `true` when `role` is at least as strong as `atLeast`. */
export const roleAtLeast = (role: SpaceRole, atLeast: SpaceRole): boolean =>
	ROLE_SENIORITY.indexOf(role) <= ROLE_SENIORITY.indexOf(atLeast);

export const isSpaceRole = (value: string): value is SpaceRole =>
	(SPACE_ROLES as readonly string[]).includes(value);
