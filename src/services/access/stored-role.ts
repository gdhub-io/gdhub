import type { SpaceRole } from "@/config/permissions/roles";
import type { SpaceType } from "@/config/spaces";
import { prisma } from "@/services/prisma";

/**
 * Role recorded in `SpaceMember`, or `null` when there is none.
 *
 * Kept apart from the resolver so the membership read is one obvious query: it
 * runs on every space gate, and a revoked row must never grant anything.
 */
export const storedRole = async (
	type: SpaceType,
	spaceId: string,
	userId: string,
): Promise<SpaceRole | null> => {
	const membership = await prisma.spaceMember.findUnique({
		where: {
			spaceType_spaceId_userId: { spaceType: type, spaceId, userId },
		},
		select: { role: true, revokedAt: true },
	});

	if (!membership || membership.revokedAt) return null;

	return membership.role;
};
