import type { SpaceRolePermission } from "@gdhub-io/gdhub-prisma";
import type { MatrixRow } from "@/config/permissions/matrix";
import type { SpaceRole } from "@/config/permissions/roles";

/**
 * A row as it currently exists in `SpaceRolePermission` — derived from the
 * Prisma model rather than retyped, so a schema change shows up here.
 */
export type StoredRow = Pick<
	SpaceRolePermission,
	| "id"
	| "spaceType"
	| "role"
	| "permission"
	| "allowed"
	| "scope"
	| "createdAt"
	| "updatedAt"
>;

export type SyncPlan = {
	create: {
		spaceType: string;
		role: SpaceRole;
		permission: string;
		allowed: boolean;
		scope: "own" | null;
	}[];
	update: { id: string; allowed: boolean; scope: "own" | null; key: string }[];
	/** Rows that differ but were edited by hand — left alone unless forced. */
	keepEdited: string[];
	/** Rows whose permission no longer exists in the catalogue. */
	remove: { id: string; key: string }[];
};

/**
 * A row counts as hand-edited when it was written after being created. The
 * seeder must not undo a checkbox someone unticked on purpose in the admin UI.
 */
const EDIT_TOLERANCE_MS = 1_000;

export const rowKey = (
	spaceType: string,
	role: string,
	permission: string,
): string => `${spaceType}:${role}:${permission}`;

const wasHandEdited = (row: StoredRow): boolean =>
	row.updatedAt.getTime() - row.createdAt.getTime() > EDIT_TOLERANCE_MS;

/**
 * Diffs the generated matrix against what is stored. Pure on purpose: the
 * decisions are the part worth testing, the writes are trivial.
 */
export function planMatrixSync(
	desired: MatrixRow[],
	existing: StoredRow[],
	options: { force?: boolean } = {},
): SyncPlan {
	const plan: SyncPlan = {
		create: [],
		update: [],
		keepEdited: [],
		remove: [],
	};

	const storedByKey = new Map(
		existing.map((row) => [
			rowKey(row.spaceType, row.role, row.permission),
			row,
		]),
	);
	const desiredKeys = new Set<string>();

	for (const row of desired) {
		const key = rowKey(row.spaceType, row.role, row.permission);

		desiredKeys.add(key);

		const stored = storedByKey.get(key);

		if (!stored) {
			plan.create.push({
				spaceType: row.spaceType,
				role: row.role,
				permission: row.permission,
				allowed: row.allowed,
				scope: row.scope,
			});
			continue;
		}

		const differs =
			stored.allowed !== row.allowed || (stored.scope ?? null) !== row.scope;

		if (!differs) continue;

		if (wasHandEdited(stored) && !options.force) {
			plan.keepEdited.push(key);
			continue;
		}

		plan.update.push({
			id: stored.id,
			allowed: row.allowed,
			scope: row.scope,
			key,
		});
	}

	for (const row of existing) {
		const key = rowKey(row.spaceType, row.role, row.permission);

		if (!desiredKeys.has(key)) plan.remove.push({ id: row.id, key });
	}

	return plan;
}
