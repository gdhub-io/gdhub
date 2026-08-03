import type { SpaceRole } from "@/config/permissions/roles";
import type { SpaceType } from "@/config/spaces";
import { prisma } from "@/services/prisma";
import { DEFAULT_SPACE_ID } from "./types";

/**
 * The single way membership is written.
 *
 * Domain tables keep domain data — speciality, equity, payments — while who may
 * enter a space and as what lives here (docs/roles-and-permissions.md §5.2).
 *
 * Every function takes an optional client so it can run inside the same
 * transaction as the entity it belongs to. That matters both ways: a project
 * created without its owner row would be unreachable, and a project deleted
 * without `deleteSpaceMembership` leaves rows pointing at nothing.
 */

type Client = Pick<typeof prisma, "spaceMember">;

type Membership = {
	type: SpaceType;
	/** Entity id; omit for hub / admin / dev. */
	spaceId?: string;
	userId: string;
	role: SpaceRole;
	invitedById?: string;
};

/**
 * Adds or updates a membership. Idempotent: re-running with the same role is a
 * no-op, which is what the backfill relies on.
 */
export const joinSpace = async (
	{ type, spaceId = DEFAULT_SPACE_ID, userId, role, invitedById }: Membership,
	client: Client = prisma,
) =>
	client.spaceMember.upsert({
		where: {
			spaceType_spaceId_userId: { spaceType: type, spaceId, userId },
		},
		create: {
			spaceType: type,
			spaceId,
			userId,
			role,
			invitedById,
			joinedAt: new Date(),
		},
		update: { role, revokedAt: null },
	});

/** Takes a membership away without deleting the history of it. */
export const revokeSpaceMember = async (
	{
		type,
		spaceId = DEFAULT_SPACE_ID,
		userId,
	}: Omit<Membership, "role" | "invitedById">,
	client: Client = prisma,
) =>
	client.spaceMember.updateMany({
		where: { spaceType: type, spaceId, userId, revokedAt: null },
		data: { revokedAt: new Date() },
	});

/**
 * Removes every membership of a space. Call it in the same transaction that
 * deletes the entity: there is no foreign key to cascade from, because the link
 * to a project / event / course is polymorphic (§5.1).
 */
export const deleteSpaceMembership = async (
	type: SpaceType,
	spaceId: string,
	client: Client = prisma,
) => client.spaceMember.deleteMany({ where: { spaceType: type, spaceId } });

/** Members of a space, strongest role first. */
export const listSpaceMembers = async (
	type: SpaceType,
	spaceId: string = DEFAULT_SPACE_ID,
) =>
	prisma.spaceMember.findMany({
		where: { spaceType: type, spaceId, revokedAt: null },
		orderBy: { role: "asc" },
		select: {
			userId: true,
			role: true,
			customRoleKey: true,
			joinedAt: true,
			user: { select: { id: true, name: true, email: true, image: true } },
		},
	});

/** Spaces a user belongs to, of one type or of all types. */
export const listUserMemberships = async (userId: string, type?: SpaceType) =>
	prisma.spaceMember.findMany({
		where: { userId, revokedAt: null, ...(type ? { spaceType: type } : {}) },
		select: {
			spaceType: true,
			spaceId: true,
			role: true,
			customRoleKey: true,
		},
	});
