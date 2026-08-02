import { AuditAction } from "@gdhub-io/gdhub-prisma";
import { SPACE_ROLES, type SpaceRole } from "@/config/permissions/roles";
import type { SpaceType } from "@/config/spaces";
import { prisma } from "@/services/prisma";
import { logRbacChange } from "./audit";
import { invalidateMatrix } from "./matrix-source";
import {
	type CatalogFeature,
	catalogOf,
	defaultsKey,
	defaultsOf,
	diffPermissions,
	permissionCatalog,
	splitByCatalog,
} from "./role-catalog";

/**
 * Reading and writing `SpaceRolePermission` from the admin UI.
 *
 * The registry in code stays the source of truth for what a permission *is*;
 * this table only records who may use it. A permission that left the catalogue
 * is therefore never shown, whatever the table still holds.
 */

export type RoleView = {
	role: SpaceRole;
	permissions: string[];
	/** What the registry would generate — what "reset to defaults" restores. */
	defaultPermissions: string[];
	/** True while the role still matches what the registry would generate. */
	isDefault: boolean;
};

export type CustomRoleView = {
	id: string;
	key: string;
	title: string;
	/** null — a template for every space of this type. */
	spaceId: string | null;
	permissions: string[];
};

export type SpaceRolesView = {
	spaceType: SpaceType;
	features: CatalogFeature[];
	catalog: string[];
	roles: RoleView[];
	customRoles: CustomRoleView[];
};

class UnknownPermissionsError extends Error {
	constructor(readonly permissions: string[]) {
		super(`unknown permissions: ${permissions.join(", ")}`);
		this.name = "UnknownPermissionsError";
	}
}

/** Throws when the set contains anything the space does not declare. */
const assertInCatalog = (
	spaceType: SpaceType,
	permissions: readonly string[],
): string[] => {
	const { known, unknown } = splitByCatalog(spaceType, permissions);

	if (unknown.length > 0) throw new UnknownPermissionsError(unknown);

	return known;
};

export { UnknownPermissionsError };

const storedAllowed = async (spaceType: SpaceType) => {
	const rows = await prisma.spaceRolePermission.findMany({
		where: { spaceType },
		select: { role: true, permission: true, allowed: true, scope: true },
	});

	return new Map(
		rows.map((row) => [
			defaultsKey(row.role, row.permission),
			{ allowed: row.allowed, scope: row.scope === "own" ? "own" : null },
		]),
	);
};

/** Permissions a role currently has, in catalogue order. */
const allowedFor = (
	role: SpaceRole,
	catalog: readonly string[],
	stored: Map<string, { allowed: boolean }>,
	defaults: Map<string, { allowed: boolean }>,
): string[] =>
	catalog.filter((permission) => {
		const key = defaultsKey(role, permission);

		return (stored.get(key) ?? defaults.get(key))?.allowed ?? false;
	});

/** Everything the roles page needs for one space. */
export const readSpaceRoles = async (
	spaceType: SpaceType,
): Promise<SpaceRolesView> => {
	const catalog = permissionCatalog(spaceType);
	const defaults = defaultsOf(spaceType);

	const [stored, customRoles] = await Promise.all([
		storedAllowed(spaceType),
		prisma.spaceCustomRole.findMany({
			where: { spaceType },
			orderBy: { key: "asc" },
			select: {
				id: true,
				key: true,
				title: true,
				spaceId: true,
				permissions: true,
			},
		}),
	]);

	const roles = SPACE_ROLES.map((role) => {
		const permissions = allowedFor(role, catalog, stored, defaults);
		const asDefault = allowedFor(role, catalog, new Map(), defaults);
		const { added, removed } = diffPermissions(asDefault, permissions);

		return {
			role,
			permissions,
			defaultPermissions: asDefault,
			isDefault: added.length === 0 && removed.length === 0,
		};
	});

	const known = new Set(catalog);

	return {
		spaceType,
		features: catalogOf(spaceType),
		catalog,
		roles,
		customRoles: customRoles.map((custom) => ({
			...custom,
			permissions: custom.permissions.filter((permission) =>
				known.has(permission),
			),
		})),
	};
};

/**
 * Rewrites one role's permissions. Every permission of the catalogue is written,
 * allowed or not: an absent row means "fall back to the generated default", and
 * after an explicit edit there is no default to fall back to.
 */
export const setRolePermissions = async ({
	spaceType,
	role,
	permissions,
	actorUserId,
}: {
	spaceType: SpaceType;
	role: SpaceRole;
	permissions: readonly string[];
	actorUserId: string;
}): Promise<{ added: string[]; removed: string[] }> => {
	const next = new Set(assertInCatalog(spaceType, permissions));
	const catalog = permissionCatalog(spaceType);
	const defaults = defaultsOf(spaceType);
	const stored = await storedAllowed(spaceType);
	const before = allowedFor(role, catalog, stored, defaults);
	const diff = diffPermissions(
		before,
		catalog.filter((p) => next.has(p)),
	);

	if (diff.added.length === 0 && diff.removed.length === 0) return diff;

	await prisma.$transaction(
		catalog.map((permission) => {
			const scope = defaults.get(defaultsKey(role, permission))?.scope ?? null;
			const allowed = next.has(permission);

			return prisma.spaceRolePermission.upsert({
				where: {
					spaceType_role_permission: { spaceType, role, permission },
				},
				create: { spaceType, role, permission, allowed, scope },
				update: { allowed },
			});
		}),
	);

	invalidateMatrix();

	await logRbacChange({
		entity: "space_role",
		entityId: `${spaceType}:${role}`,
		action: AuditAction.UPDATE,
		actorUserId,
		changes: diff,
		meta: { spaceType, role },
	});

	return diff;
};

/** Throws away every hand edit for one space and regenerates from the registry. */
export const resetSpaceRoles = async ({
	spaceType,
	actorUserId,
}: {
	spaceType: SpaceType;
	actorUserId: string;
}): Promise<{ restored: number }> => {
	const defaults = defaultsOf(spaceType);
	const catalog = permissionCatalog(spaceType);

	await prisma.$transaction([
		prisma.spaceRolePermission.deleteMany({ where: { spaceType } }),
		prisma.spaceRolePermission.createMany({
			data: SPACE_ROLES.flatMap((role) =>
				catalog.map((permission) => {
					const state = defaults.get(defaultsKey(role, permission));

					return {
						spaceType,
						role,
						permission,
						allowed: state?.allowed ?? false,
						scope: state?.scope ?? null,
					};
				}),
			),
		}),
	]);

	invalidateMatrix();

	await logRbacChange({
		entity: "space_role",
		entityId: `${spaceType}:*`,
		action: AuditAction.UPDATE_MANY,
		actorUserId,
		meta: { spaceType, reset: true },
	});

	return { restored: SPACE_ROLES.length * catalog.length };
};

export const createCustomRole = async ({
	spaceType,
	spaceId,
	key,
	title,
	permissions,
	actorUserId,
}: {
	spaceType: SpaceType;
	spaceId?: string | null;
	key: string;
	title: string;
	permissions: readonly string[];
	actorUserId: string;
}): Promise<CustomRoleView> => {
	const allowed = assertInCatalog(spaceType, permissions);

	const created = await prisma.spaceCustomRole.create({
		data: {
			spaceType,
			spaceId: spaceId ?? null,
			key,
			title,
			permissions: allowed,
		},
		select: {
			id: true,
			key: true,
			title: true,
			spaceId: true,
			permissions: true,
		},
	});

	await logRbacChange({
		entity: "space_custom_role",
		entityId: created.id,
		action: AuditAction.CREATE,
		actorUserId,
		changes: { added: allowed, removed: [] },
		meta: { spaceType, key, title },
	});

	return created;
};

export const updateCustomRole = async ({
	id,
	title,
	permissions,
	actorUserId,
}: {
	id: string;
	title?: string;
	permissions?: readonly string[];
	actorUserId: string;
}): Promise<CustomRoleView> => {
	const current = await prisma.spaceCustomRole.findUniqueOrThrow({
		where: { id },
		select: { spaceType: true, permissions: true },
	});

	const allowed = permissions
		? assertInCatalog(current.spaceType as SpaceType, permissions)
		: undefined;

	const updated = await prisma.spaceCustomRole.update({
		where: { id },
		data: { title, ...(allowed ? { permissions: allowed } : {}) },
		select: {
			id: true,
			key: true,
			title: true,
			spaceId: true,
			permissions: true,
		},
	});

	await logRbacChange({
		entity: "space_custom_role",
		entityId: id,
		action: AuditAction.UPDATE,
		actorUserId,
		changes: allowed
			? diffPermissions(current.permissions, allowed)
			: undefined,
		meta: { spaceType: current.spaceType, title },
	});

	return updated;
};

/**
 * Deletes a custom role and the memberships that name it. Without the second
 * half those memberships would keep their base role but lose the permission set
 * it was narrowed to — a quiet promotion.
 */
export const deleteCustomRole = async ({
	id,
	actorUserId,
}: {
	id: string;
	actorUserId: string;
}): Promise<{ detached: number }> => {
	const role = await prisma.spaceCustomRole.findUniqueOrThrow({
		where: { id },
		select: { spaceType: true, spaceId: true, key: true },
	});

	const [detached] = await prisma.$transaction([
		prisma.spaceMember.updateMany({
			where: {
				spaceType: role.spaceType,
				customRoleKey: role.key,
				...(role.spaceId ? { spaceId: role.spaceId } : {}),
			},
			data: { customRoleKey: null, revokedAt: new Date() },
		}),
		prisma.spaceCustomRole.delete({ where: { id } }),
	]);

	await logRbacChange({
		entity: "space_custom_role",
		entityId: id,
		action: AuditAction.DELETE,
		actorUserId,
		meta: { ...role, revokedMemberships: detached.count },
	});

	return { detached: detached.count };
};
