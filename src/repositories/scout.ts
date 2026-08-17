import type { ScoutType } from "@gdhub-io/gdhub-prisma";
import { SpaceRole } from "@/config/permissions/roles";
import { joinSpace, revokeSpaceMember } from "@/services/access/membership";
import { prisma } from "@/services/prisma";

const CABINET_SELECT = {
	id: true,
	type: true,
	organizationName: true,
	logo: true,
	about: true,
	website: true,
	isPublic: true,
	interestTypes: true,
	platforms: true,
	genres: true,
	stages: true,
	alertOnMatchingProjects: true,
	alertOnSavedSearches: true,
	alertMonthlyDigest: true,
} as const;

export type ScoutCabinet = NonNullable<Awaited<ReturnType<typeof getCabinet>>>;

/**
 * The scout's cabinet, or `null`.
 *
 * Never creates one: the cabinet is what makes someone a scout, and it is
 * created deliberately from the admin (`createScout`). Reading a page must not
 * be able to mint one.
 */
export async function getCabinet(userId: string) {
	return prisma.scoutCabinet.findUnique({
		where: { userId },
		select: CABINET_SELECT,
	});
}

export type CabinetUpdate = Partial<{
	type: ScoutType;
	organizationName: string | null;
	logo: string | null;
	about: string | null;
	website: string | null;
	isPublic: boolean;
	interestTypes: string[];
	platforms: string[];
	genres: string[];
	stages: string[];
	alertOnMatchingProjects: boolean;
	alertOnSavedSearches: boolean;
	alertMonthlyDigest: boolean;
}>;

export async function updateCabinet(userId: string, data: CabinetUpdate) {
	return prisma.scoutCabinet.update({
		where: { userId },
		data,
		select: CABINET_SELECT,
	});
}

/**
 * Undoes `createScout`: the cabinet and the access it opened, together.
 *
 * Saved searches go with the cabinet by cascade. The membership is revoked
 * rather than deleted — `revokedAt` is how this codebase records that access
 * ended, and `createScout` upserts over it if the person is made a scout again.
 */
export async function deleteScout(userId: string) {
	return prisma.$transaction(async (tx) => {
		await tx.scoutCabinet.delete({ where: { userId } });
		await revokeSpaceMember({ type: "scout", userId }, tx);
	});
}

/**
 * Makes someone a scout: the cabinet and the membership that opens the space,
 * in one transaction. Either both exist or neither does — a cabinet nobody can
 * open, or an empty space with no settings behind it, are both broken states.
 */
export async function createScout(
	userId: string,
	data: CabinetUpdate,
	invitedById?: string,
) {
	return prisma.$transaction(async (tx) => {
		const cabinet = await tx.scoutCabinet.upsert({
			where: { userId },
			create: { userId, ...data },
			update: data,
			select: CABINET_SELECT,
		});

		await joinSpace(
			{ type: "scout", userId, role: SpaceRole.Owner, invitedById },
			tx,
		);

		return cabinet;
	});
}

/** Every scout cabinet, for the admin table. */
export async function listScouts() {
	return prisma.scoutCabinet.findMany({
		orderBy: { createdAt: "desc" },
		select: {
			...CABINET_SELECT,
			createdAt: true,
			user: { select: { id: true, name: true, email: true, image: true } },
			_count: { select: { savedSearches: true } },
		},
	});
}
