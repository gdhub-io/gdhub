import type {
	RoleOverride,
	SpaceDefinition,
} from "@/config/spaces/define-space";
import { permissionsOf } from "@/config/spaces/define-space";
import type { Action } from "./actions";
import { isAllowedByDefault } from "./defaults";
import { SPACE_ROLES, type SpaceRole } from "./roles";

/** One cell of the "role → permission" matrix, as stored in the database. */
export type MatrixRow = {
	spaceType: string;
	role: SpaceRole;
	permission: string;
	allowed: boolean;
	scope: "own" | null;
};

type Resolved = { allowed: boolean; scope: "own" | null };

/** `space.feature.action` → its action part. */
const actionOf = (permission: string): Action =>
	permission.split(".")[2] as Action;

const applyOverride = (
	current: Resolved,
	override: RoleOverride,
	permission: string,
): Resolved => {
	if (Array.isArray(override)) {
		return override.includes(permission)
			? { ...current, allowed: true }
			: current;
	}

	const value = (override as Record<string, boolean | "own">)[permission];

	if (value === undefined) return current;
	if (value === "own") return { allowed: true, scope: "own" };

	return { allowed: value, scope: value ? current.scope : null };
};

/**
 * Builds the full matrix out of the registry: every (role, permission) pair gets
 * a row, so the admin UI has a cell for every checkbox and the seed can diff
 * cleanly.
 *
 * The matrix is never written by hand — it is generated from a space's features
 * and the action-class defaults, then edited in the admin UI.
 *
 * See docs/roles-and-permissions.md §3.5.
 */
export function buildPermissionMatrix(spaces: SpaceDefinition[]): MatrixRow[] {
	const rows: MatrixRow[] = [];

	for (const space of spaces) {
		for (const permission of permissionsOf(space)) {
			for (const role of SPACE_ROLES) {
				const base: Resolved = {
					allowed: isAllowedByDefault(actionOf(permission), role),
					scope: null,
				};

				const override = space.overrides?.[role];
				const { allowed, scope } = override
					? applyOverride(base, override, permission)
					: base;

				rows.push({ spaceType: space.type, role, permission, allowed, scope });
			}
		}
	}

	return rows;
}

/** Lookup by `role:permission`, for tests and the admin UI. */
export const matrixLookup = (rows: MatrixRow[]): Map<string, Resolved> =>
	new Map(
		rows.map((row) => [
			`${row.role}:${row.permission}`,
			{ allowed: row.allowed, scope: row.scope },
		]),
	);
