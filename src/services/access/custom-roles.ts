import type { SpaceType } from "@/config/spaces";
import { prisma } from "@/services/prisma";
import { permissionCatalog } from "./role-catalog";

/**
 * A custom role is a named subset of a space's catalogue — marketer, HR,
 * moderator. When a membership names one it replaces the matrix for that
 * membership, and the base role only takes part in seniority (§5.6).
 *
 * Returns `null` when the key resolves to nothing: the role was deleted, and a
 * membership pointing at a role that no longer exists must not fall back to the
 * broader base role.
 */
export const customRolePermissions = async (
	spaceType: SpaceType,
	spaceId: string,
	key: string,
): Promise<string[] | null> => {
	const roles = await prisma.spaceCustomRole.findMany({
		where: { spaceType, key, OR: [{ spaceId }, { spaceId: null }] },
		select: { spaceId: true, permissions: true },
	});

	if (roles.length === 0) return null;

	// A role defined for this space instance wins over the type-wide template.
	const match = roles.find((role) => role.spaceId === spaceId) ?? roles[0];
	const catalog = new Set(permissionCatalog(spaceType));

	return (match?.permissions ?? []).filter((permission) =>
		catalog.has(permission),
	);
};
