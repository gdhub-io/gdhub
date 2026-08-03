import type { SpaceRole } from "@/config/permissions/roles";
import type { SpaceType } from "@/config/spaces";
import { prisma } from "@/services/prisma";

/** Membership as recorded in `SpaceMember`, or `null` when there is none. */
export type StoredMembership = {
	role: SpaceRole;
	/** When set, permissions come from `SpaceCustomRole` instead of the matrix. */
	customRoleKey: string | null;
};

/**
 * Kept apart from the resolver so the membership read is one obvious query: it
 * runs on every space gate, and a revoked row must never grant anything.
 */
export const storedMembership = async (
	type: SpaceType,
	spaceId: string,
	userId: string,
): Promise<StoredMembership | null> => {
	const membership = await prisma.spaceMember.findUnique({
		where: {
			spaceType_spaceId_userId: { spaceType: type, spaceId, userId },
		},
		select: { role: true, customRoleKey: true, revokedAt: true },
	});

	if (!membership || membership.revokedAt) return null;

	return { role: membership.role, customRoleKey: membership.customRoleKey };
};

/** Just the role, for the paths that do not care about custom roles. */
export const storedRole = async (
	type: SpaceType,
	spaceId: string,
	userId: string,
): Promise<SpaceRole | null> =>
	(await storedMembership(type, spaceId, userId))?.role ?? null;
