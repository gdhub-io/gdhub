import type { MatrixRow } from "@/config/permissions/matrix";
import { prisma } from "@/services/prisma";

/**
 * Reads the matrix out of `SpaceRolePermission`. Server-only: imported lazily by
 * the matrix source so nothing drags Prisma into a client bundle.
 *
 * No role translation happens here — code and database use the same enum.
 */
export const loadMatrixFromDb = async (): Promise<MatrixRow[]> => {
	const rows = await prisma.spaceRolePermission.findMany({
		select: {
			spaceType: true,
			role: true,
			permission: true,
			allowed: true,
			scope: true,
		},
	});

	return rows.map((row) => ({
		spaceType: row.spaceType,
		role: row.role,
		permission: row.permission,
		allowed: row.allowed,
		scope: row.scope === "own" ? "own" : null,
	}));
};
