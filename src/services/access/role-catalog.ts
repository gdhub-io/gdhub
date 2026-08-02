import { buildPermissionMatrix } from "@/config/permissions/matrix";
import type { SpaceRole } from "@/config/permissions/roles";
import { SPACES, type SpaceType } from "@/config/spaces";
import {
	permissionsOf,
	type SpaceDefinition,
} from "@/config/spaces/define-space";
import type { PermissionState } from "./matrix-source";

/**
 * What the admin UI needs to know about a space before it can draw a checkbox:
 * which permissions exist, what the registry would grant by default, and how a
 * submitted set differs from the current one.
 *
 * Pure on purpose — the page renders this on the client and the tests cover it
 * without a database.
 */

/** One feature of a space with the permissions it produces. */
export type CatalogFeature = {
	feature: string;
	permissions: { permission: string; action: string }[];
};

const definitionOf = (spaceType: SpaceType): SpaceDefinition =>
	SPACES[spaceType] as SpaceDefinition;

export const catalogOf = (spaceType: SpaceType): CatalogFeature[] =>
	Object.entries(definitionOf(spaceType).features).map(
		([feature, actions]) => ({
			feature,
			permissions: actions.map((action) => ({
				permission: `${spaceType}.${feature}.${action}`,
				action,
			})),
		}),
	);

/** Every permission of a space, in catalogue order. */
export const permissionCatalog = (spaceType: SpaceType): string[] =>
	permissionsOf(definitionOf(spaceType));

export const defaultsKey = (role: SpaceRole, permission: string): string =>
	`${role}:${permission}`;

/** `role:permission` → the state the registry would generate for it. */
export const defaultsOf = (
	spaceType: SpaceType,
): Map<string, PermissionState> =>
	new Map(
		buildPermissionMatrix([definitionOf(spaceType)]).map((row) => [
			defaultsKey(row.role, row.permission),
			{ allowed: row.allowed, scope: row.scope },
		]),
	);

export type PermissionDiff = { added: string[]; removed: string[] };

export const diffPermissions = (
	before: readonly string[],
	after: readonly string[],
): PermissionDiff => {
	const had = new Set(before);
	const has = new Set(after);

	return {
		added: after.filter((permission) => !had.has(permission)),
		removed: before.filter((permission) => !has.has(permission)),
	};
};

/**
 * Splits a submitted set into what the space declares and what it does not. The
 * unknown half is an error, not something to silently drop: a typo in a
 * permission name would otherwise look like a saved checkbox that never applies.
 */
export const splitByCatalog = (
	spaceType: SpaceType,
	permissions: readonly string[],
): { known: string[]; unknown: string[] } => {
	const catalog = new Set(permissionCatalog(spaceType));
	const known: string[] = [];
	const unknown: string[] = [];

	for (const permission of permissions) {
		(catalog.has(permission) ? known : unknown).push(permission);
	}

	return { known, unknown };
};
