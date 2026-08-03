import {
	buildPermissionMatrix,
	type MatrixRow,
} from "@/config/permissions/matrix";
import type { SpaceRole } from "@/config/permissions/roles";
import { spaceList } from "@/config/spaces";

/** Effective state of one permission for one role. */
export type PermissionState = { allowed: boolean; scope: "own" | null };

/** `spaceType:role` → permission → state. */
export type MatrixIndex = Map<string, Map<string, PermissionState>>;

export type MatrixSource = () => MatrixRow[] | Promise<MatrixRow[]>;

/**
 * Where the matrix in use came from.
 *
 *  - `stored`      — read from `SpaceRolePermission`, everything is normal;
 *  - `defaults`    — the table is empty, so the registry in code is used. Only
 *                    happens before the first seed, and code and database agree
 *                    by definition at that point;
 *  - `stale`       — the read failed, the last successful snapshot is being
 *                    served. Real data, just possibly a minute old;
 *  - `unavailable` — the read failed and nothing was ever loaded. Every
 *                    permission is denied.
 */
export type MatrixHealth = {
	source: "stored" | "defaults" | "stale" | "unavailable";
	loadedAt: number | null;
	lastError: string | null;
};

/** The registry in code — the shape the seed writes to the database. */
export const codeSource = (): MatrixRow[] => buildPermissionMatrix(spaceList());

/** Reads `SpaceRolePermission`; Prisma is imported lazily. */
const dbSource: MatrixSource = async () => {
	const { loadMatrixFromDb } = await import("./matrix-db");

	return loadMatrixFromDb();
};

let source: MatrixSource = dbSource;
/**
 * The last matrix that loaded successfully. Deliberately never thrown away: it
 * is the fallback for a failed read, and losing it would mean denying every
 * permission the moment the database blinks.
 */
let snapshot: { index: MatrixIndex; loadedAt: number } | null = null;
/** When the snapshot stops being fresh enough to serve without a re-read. */
let expiresAt = 0;
let health: MatrixHealth = {
	source: "unavailable",
	loadedAt: null,
	lastError: null,
};
/**
 * What was reported last. Kept apart from `health` so the very first failure is
 * logged too — the starting state is already "unavailable", so comparing
 * against it would swallow exactly the message worth seeing.
 */
let loggedSource: MatrixHealth["source"] | null = null;

/** How long a loaded matrix is reused, in milliseconds. */
const CACHE_TTL_MS = 60_000;
/** How long to keep serving a stale snapshot before trying the source again. */
const RETRY_AFTER_MS = 5_000;

export const indexKey = (spaceType: string, role: SpaceRole): string =>
	`${spaceType}:${role}`;

const buildIndex = (rows: MatrixRow[]): MatrixIndex => {
	const index: MatrixIndex = new Map();

	for (const row of rows) {
		const key = indexKey(row.spaceType, row.role);
		const bucket = index.get(key) ?? new Map<string, PermissionState>();

		bucket.set(row.permission, { allowed: row.allowed, scope: row.scope });
		index.set(key, bucket);
	}

	return index;
};

/** Logs a state change once instead of on every request. */
const setHealth = (next: MatrixHealth): void => {
	const changed = next.source !== loggedSource;
	health = next;

	if (!changed) return;

	loggedSource = next.source;

	switch (next.source) {
		case "defaults":
			console.warn(
				"[rbac] SpaceRolePermission is empty — using the generated defaults. Run `bun run rbac:seed-matrix`.",
			);
			break;
		case "stale":
			console.error(
				`[rbac] cannot read the permission matrix, serving the last snapshot from ${new Date(next.loadedAt ?? 0).toISOString()}: ${next.lastError}`,
			);
			break;
		case "unavailable":
			console.error(
				`[rbac] cannot read the permission matrix and have no snapshot — denying every permission: ${next.lastError}`,
			);
			break;
		default:
			console.info("[rbac] permission matrix loaded");
	}
};

/**
 * Replaces the source (fixtures in tests) and drops the cache. Passing nothing
 * restores the database source.
 */
export const setMatrixSource = (next: MatrixSource = dbSource): void => {
	source = next;
	snapshot = null;
	expiresAt = 0;
	health = { source: "unavailable", loadedAt: null, lastError: null };
	loggedSource = null;
};

/**
 * Forces the next read to hit the source — call after the matrix is edited in
 * the admin UI. The snapshot itself is kept: it is the fallback if that read
 * fails.
 */
export const invalidateMatrix = (): void => {
	expiresAt = 0;
};

export const getMatrixHealth = (): MatrixHealth => health;

/**
 * The matrix in use.
 *
 * Reading it must never quietly substitute the code defaults for stored data:
 * an admin who revoked a permission would silently get it back on the next
 * database blip. Code defaults are only used when the table is genuinely empty
 * — before the first seed, when the two agree anyway.
 */
export const getMatrix = async (): Promise<MatrixIndex> => {
	if (snapshot && Date.now() < expiresAt) return snapshot.index;

	try {
		const rows = await source();
		const loadedAt = Date.now();
		const empty = rows.length === 0;

		// An empty table is honest: the seed has not run yet, and at that point
		// the generated defaults are exactly what it would contain.
		snapshot = {
			index: buildIndex(empty ? codeSource() : rows),
			loadedAt,
		};
		expiresAt = loadedAt + CACHE_TTL_MS;

		setHealth({
			source: empty ? "defaults" : "stored",
			loadedAt,
			lastError: null,
		});

		return snapshot.index;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);

		if (snapshot) {
			// Stale truth beats invented truth: serving the code defaults here
			// would silently hand back every permission an admin has revoked.
			// Back off before hammering a source that is already failing.
			expiresAt = Date.now() + RETRY_AFTER_MS;
			setHealth({
				source: "stale",
				loadedAt: snapshot.loadedAt,
				lastError: message,
			});

			return snapshot.index;
		}

		setHealth({ source: "unavailable", loadedAt: null, lastError: message });

		return new Map();
	}
};

/** Permissions granted to a role in a space, with their scopes. */
export const permissionsForRole = async (
	spaceType: string,
	role: SpaceRole,
): Promise<Map<string, PermissionState>> => {
	const index = await getMatrix();
	const bucket = index.get(indexKey(spaceType, role));

	if (!bucket) return new Map();

	return new Map([...bucket.entries()].filter(([, state]) => state.allowed));
};
