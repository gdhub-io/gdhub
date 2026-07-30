import {
	CourseStudentStatus,
	TeamMemberStatus,
	UserRole,
} from "@gdhub-io/gdhub-prisma";
import { prisma } from "@/services/prisma";

/** Kinds of "space" a user can enter. */
export type SpaceType = "project" | "event" | "course" | "admin" | "dev";

/** The caller's role within a space. `none` means no access. */
export type SpaceRole = "owner" | "admin" | "member" | "none";

/** Minimal user shape needed to resolve access (from `auth()` session). */
export type SpaceAccessUser = {
	id: string;
	roles?: UserRole[];
} | null;

const isPlatformAdmin = (user: SpaceAccessUser): boolean =>
	!!user?.roles?.includes(UserRole.Admin);

/**
 * Single source of truth for "can this user enter this space, and as what role".
 *
 * The semantics intentionally mirror the existing per-space gates so adopting
 * this resolver as a server-side gate does not change who has access:
 *  - project: author or `Founder` → `owner`; any other team membership →
 *    `member`; otherwise `none`. (matches GET /api/user/project)
 *  - event:   creator → `owner`; platform Admin → `admin`; otherwise `none`.
 *    (matches GET /api/user/event/[id]) Event participants do not get access to
 *    the management space.
 *  - course:  creator → `owner`; an enrolled/finished student → `member`;
 *    otherwise `none`.
 *  - admin:   platform Admin → `admin`; otherwise `none`.
 *  - dev:     non-production only → `admin`; otherwise `none`.
 *
 * `id` is the space entity id/slug (required for project/event, ignored for
 * admin/dev).
 */
export async function resolveSpaceAccess(
	type: SpaceType,
	id: string | null,
	user: SpaceAccessUser,
): Promise<SpaceRole> {
	if (!user) return "none";

	switch (type) {
		case "admin":
			return isPlatformAdmin(user) ? "admin" : "none";
		case "dev":
			return process.env.NODE_ENV !== "production" ? "admin" : "none";
		case "project":
			return resolveProjectAccess(id, user);
		case "event":
			return resolveEventAccess(id, user);
		case "course":
			return resolveCourseAccess(id, user);
		default:
			return "none";
	}
}

async function resolveProjectAccess(
	id: string | null,
	user: NonNullable<SpaceAccessUser>,
): Promise<SpaceRole> {
	if (!id) return "none";

	const project = await prisma.project.findFirst({
		where: { OR: [{ slug: id }, { id }] },
		select: {
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

	if (!project) return "none";
	if (project.authorId === user.id) return "owner";

	const membership = project.team?.members[0];
	if (!membership) return "none";
	return membership.status === TeamMemberStatus.Founder ? "owner" : "member";
}

async function resolveEventAccess(
	id: string | null,
	user: NonNullable<SpaceAccessUser>,
): Promise<SpaceRole> {
	if (!id) return "none";

	const event = await prisma.event.findUnique({
		where: { id },
		select: { createdById: true },
	});

	if (!event) return "none";
	if (event.createdById === user.id) return "owner";
	return isPlatformAdmin(user) ? "admin" : "none";
}

async function resolveCourseAccess(
	id: string | null,
	user: NonNullable<SpaceAccessUser>,
): Promise<SpaceRole> {
	if (!id) return "none";

	const course = await prisma.course.findFirst({
		where: { OR: [{ slug: id }, { id }] },
		select: {
			createdById: true,
			groups: {
				select: {
					students: {
						where: {
							userId: user.id,
							status: {
								in: [
									CourseStudentStatus.Enrolled,
									CourseStudentStatus.Finished,
								],
							},
						},
						select: { userId: true },
					},
				},
			},
		},
	});

	if (!course) return "none";
	if (course.createdById === user.id) return "owner";

	const enrolled = course.groups.some((group) => group.students.length > 0);
	return enrolled ? "member" : "none";
}
