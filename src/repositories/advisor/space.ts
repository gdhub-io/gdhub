import { SpaceRole } from "@/config/permissions/roles";
import { DEFAULT_SPACE_ID, type SpaceAdapter } from "@/services/access/types";
import { prisma } from "@/services/prisma";

/**
 * Advisor space adapter.
 *
 * The role is derived from the speciality rather than a `SpaceMember` row, so
 * switching mentorship off closes the space in the same write that hides the
 * expert card and existing advisors need no backfill. `Owner` because `manage`
 * and `delete` are not member-class actions. A signed agreement joins this
 * condition in step 4 (docs/intent/GDHUB-24-advisor-space.md).
 */
export const advisorSpaceAdapter: SpaceAdapter = {
	resolve: async (_param, user) => {
		const open = await prisma.speciality.count({
			where: { userId: user.id, isOpenForMentoring: true },
		});

		return open > 0
			? { spaceId: DEFAULT_SPACE_ID, role: SpaceRole.Owner }
			: null;
	},
};
