import { prisma } from "@/services/prisma";

/** How many spaces of one kind the switcher lists before "View all". */
export const SWITCHER_GROUP_SIZE = 5;

export type UserSpace = {
	id: string;
	slug: string | null;
	name: string;
	/** The user's role in the space, already in the words the menu shows. */
	role: string;
	/** The space's own state — a project's stage, an event's status. */
	status: string;
	coverUrl: string | null;
};

export type UserSpaceGroup = { items: UserSpace[]; total: number };

export type UserSpaces = {
	projects: UserSpaceGroup;
	events: UserSpaceGroup;
	courses: UserSpaceGroup;
};

/**
 * Owner reads as "Owner"; everyone else is a participant, and which word fits
 * depends on the kind of space — you are a team member of a project but an
 * organiser of an event.
 */
const roleLabel = (role: string, kind: "project" | "event" | "course") => {
	if (role === "Owner") return "Owner";
	if (kind === "project") return "Team member";
	if (kind === "event") return "Organiser";
	return "Participant";
};

/**
 * The spaces the user belongs to, most recently joined first.
 *
 * Membership is the source of truth rather than authorship: a person invited
 * into someone else's project belongs in their switcher too. The rows come from
 * `SpaceMember`, which is polymorphic, so the entities are fetched per type
 * afterwards and stitched back in the membership's order.
 */
export async function loadUserSpaces(userId: string): Promise<UserSpaces> {
	const memberships = await prisma.spaceMember.findMany({
		where: {
			userId,
			revokedAt: null,
			spaceType: { in: ["project", "event", "course"] },
		},
		orderBy: [{ joinedAt: "desc" }, { createdAt: "desc" }],
		select: { spaceType: true, spaceId: true, role: true },
	});

	const idsOf = (type: string) =>
		memberships.filter((row) => row.spaceType === type).map((r) => r.spaceId);

	const [projects, events, courses] = await Promise.all([
		prisma.project.findMany({
			where: { id: { in: idsOf("project") } },
			select: {
				id: true,
				slug: true,
				name: true,
				status: true,
				coverImage: true,
			},
		}),
		prisma.event.findMany({
			where: { id: { in: idsOf("event") } },
			select: { id: true, slug: true, title: true, status: true, image: true },
		}),
		prisma.course.findMany({
			where: { id: { in: idsOf("course") } },
			select: { id: true, slug: true, name: true, status: true, image: true },
		}),
	]);

	const group = (
		type: "project" | "event" | "course",
		rows: Map<string, Omit<UserSpace, "role">>,
	): UserSpaceGroup => {
		// Membership order is the "recently active" order the menu promises, so
		// walk the memberships rather than the entities.
		const items = memberships
			.filter((row) => row.spaceType === type)
			.map((row) => {
				const entity = rows.get(row.spaceId);
				return entity ? { ...entity, role: roleLabel(row.role, type) } : null;
			})
			.filter((row): row is UserSpace => row !== null);

		return { items: items.slice(0, SWITCHER_GROUP_SIZE), total: items.length };
	};

	return {
		projects: group(
			"project",
			new Map(
				projects.map((p) => [
					p.id,
					{
						id: p.id,
						slug: p.slug,
						name: p.name,
						status: p.status,
						coverUrl: p.coverImage,
					},
				]),
			),
		),
		events: group(
			"event",
			new Map(
				events.map((e) => [
					e.id,
					{
						id: e.id,
						slug: e.slug,
						name: e.title,
						status: e.status,
						coverUrl: e.image,
					},
				]),
			),
		),
		courses: group(
			"course",
			new Map(
				courses.map((c) => [
					c.id,
					{
						id: c.id,
						slug: c.slug,
						name: c.name,
						status: c.status,
						coverUrl: c.image,
					},
				]),
			),
		),
	};
}
