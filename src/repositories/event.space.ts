import { EventMemberStatus } from "@gdhub-io/gdhub-prisma";
import { SpaceRole } from "@/config/permissions/roles";
import type { SpaceAdapter } from "@/services/access/types";
import { prisma } from "@/services/prisma";

/**
 * Event space adapter.
 *
 * The creator owns the space, an approved participant is a `member`. A pending
 * application does not let anyone in — applying happens on the public page
 * (docs/roles-and-permissions.md §2.2).
 */
export const eventSpaceAdapter: SpaceAdapter = {
	resolve: async (param, user) => {
		const event = await prisma.event.findUnique({
			where: { id: param },
			select: {
				id: true,
				createdById: true,
				members: {
					where: { userId: user.id, status: EventMemberStatus.Approved },
					select: { id: true },
					take: 1,
				},
			},
		});

		if (!event) return null;

		if (event.createdById === user.id) {
			return { spaceId: event.id, role: SpaceRole.Owner };
		}

		return {
			spaceId: event.id,
			role: event.members.length > 0 ? SpaceRole.Member : null,
		};
	},
};
