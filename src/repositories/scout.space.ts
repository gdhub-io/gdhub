import { DEFAULT_SPACE_ID, type SpaceAdapter } from "@/services/access/types";
import { prisma } from "@/services/prisma";

/**
 * Scout space adapter.
 *
 * The cabinet is what makes someone a scout: no cabinet, no space. Returning
 * `null` here is what turns the whole space into a 404 — a membership granted
 * without a cabinet opens nothing, so the two are always created together
 * (`createScout`).
 *
 * The role itself comes from the membership; this only answers whether the
 * space exists for this person.
 */
export const scoutSpaceAdapter: SpaceAdapter = {
	resolve: async (_param, user) => {
		const cabinet = await prisma.scoutCabinet.findUnique({
			where: { userId: user.id },
			select: { id: true },
		});

		// The role comes from the membership, not from here.
		return cabinet ? { spaceId: DEFAULT_SPACE_ID, role: null } : null;
	},
};
