import { SpaceRole } from "@/config/permissions/roles";
import { DEFAULT_SPACE_ID, type SpaceAdapter } from "@/services/access/types";
import { prisma } from "@/services/prisma";

/**
 * Advisor space adapter.
 *
 * Offering mentorship is what opens the space, so the role is derived from the
 * speciality rather than read from a `SpaceMember` row. That keeps one fact in
 * one place: switching mentorship off closes the space in the same write that
 * hides the expert card, there is no second table to drift out of step, and the
 * advisors who already exist need no backfill.
 *
 * `Owner`, not `Member`: the space holds nothing but the advisor's own rows, and
 * `Member` is read-only by default (`CLASS_DEFAULT_ROLES`), which would leave an
 * advisor unable to accept a request or delete their own review.
 *
 * A signed agreement joins this condition once the agreement exists — see
 * docs/intent/GDHUB-24-advisor-space.md, step 4.
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
