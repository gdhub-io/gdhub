import { ProjectStatus, TeamMemberStatus } from "@gdhub-io/gdhub-prisma";
import { SpaceRole } from "@/config/permissions/roles";
import type { SpaceAdapter } from "@/services/access/types";
import { prisma } from "@/services/prisma";

/**
 * Project space adapter.
 *
 * Roles mirror what the app enforced before RBAC, so switching the gates over
 * changes nobody's access: the author and a `Founder` own the space, any other
 * hired team member is a `member`, and an applicant is not inside the space at
 * all (docs/roles-and-permissions.md §2.2).
 */
export const projectSpaceAdapter: SpaceAdapter = {
	resolve: async (param, user) => {
		const project = await prisma.project.findFirst({
			where: { OR: [{ slug: param }, { id: param }] },
			select: {
				id: true,
				authorId: true,
				team: {
					select: {
						members: {
							where: { userId: user.id },
							select: { status: true },
						},
					},
				},
			},
		});

		if (!project) return null;

		if (project.authorId === user.id) {
			return { spaceId: project.id, role: SpaceRole.Owner };
		}

		const membership = project.team?.members[0];

		if (!membership) return { spaceId: project.id, role: null };

		if (membership.status === TeamMemberStatus.Founder) {
			return { spaceId: project.id, role: SpaceRole.Owner };
		}

		return {
			spaceId: project.id,
			role:
				membership.status === TeamMemberStatus.Hired ? SpaceRole.Member : null,
		};
	},

	revoked: async (spaceId) => {
		const project = await prisma.project.findUnique({
			where: { id: spaceId },
			select: { status: true },
		});

		// An archived project stays readable but freezes: nothing can be changed,
		// created or managed until it is restored.
		return project?.status === ProjectStatus.Archived
			? ["*.edit", "*.manage", "*.create", "*.invite", "*.remove", "*.publish"]
			: [];
	},
};
