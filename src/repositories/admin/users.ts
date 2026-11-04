import type { Prisma } from "@gdhub-io/gdhub-prisma";
import { isSpaceRole, type SpaceRole } from "@/config/permissions/roles";
import { isSpaceType, type SpaceType } from "@/config/spaces";
import { landingExpertWhere } from "@/repositories/content/landing";
import { getMatrix } from "@/services/access/matrix-source";
import { prisma } from "@/services/prisma";

/**
 * A membership shape that grants a permission: either a base role in a space
 * type, or a custom role that lists the permission explicitly. A membership
 * with a custom role ignores the matrix (§5.6), hence the `customRoleKey: null`
 * on base-role grants.
 */
export type PermissionGrant = {
	spaceType: string;
	role?: SpaceRole;
	customRoleKey?: string;
};

export type AdminUsersFilters = {
	/** Free text matched against name, email and specialization. */
	search?: string;
	/** Keeps only users with a live membership in a space of this type. */
	spaceType?: SpaceType;
	/** Keeps only users holding this role in a space. */
	role?: SpaceRole;
	/** Memberships that grant the requested permission; empty means "nobody". */
	permissionGrants?: PermissionGrant[];
	/** Landing experts only, or only those an admin put in "Top experts". */
	experts?: ExpertFilter;
};

export const EXPERT_FILTERS = ["experts", "featured"] as const;
export type ExpertFilter = (typeof EXPERT_FILTERS)[number];
const isExpertFilter = (value: string): value is ExpertFilter =>
	(EXPERT_FILTERS as readonly string[]).includes(value);

/** Normalizes the raw query values the admin users list accepts. */
export const parseAdminUsersFilters = ({
	search,
	spaceType,
	role,
	experts,
}: {
	search?: string;
	spaceType?: string;
	role?: string;
	experts?: string;
}): Omit<AdminUsersFilters, "permissionGrants"> => ({
	search: search?.trim() || undefined,
	spaceType: spaceType && isSpaceType(spaceType) ? spaceType : undefined,
	role: role && isSpaceRole(role) ? role : undefined,
	experts: experts && isExpertFilter(experts) ? experts : undefined,
});

/**
 * Every membership shape that currently grants `permission` — read from the
 * live matrix, so an admin's edits are reflected, plus the custom roles that
 * list it.
 */
export const resolvePermissionGrants = async (
	permission: string,
): Promise<PermissionGrant[]> => {
	const [matrix, customRoles] = await Promise.all([
		getMatrix(),
		prisma.spaceCustomRole.findMany({
			where: { permissions: { has: permission } },
			select: { spaceType: true, key: true },
		}),
	]);

	const grants: PermissionGrant[] = [];

	for (const [key, permissions] of matrix) {
		if (!permissions.get(permission)?.allowed) continue;

		const [spaceType, role] = key.split(":");
		if (!spaceType || !isSpaceRole(role || "")) continue;

		grants.push({ spaceType, role: role as SpaceRole });
	}

	for (const customRole of customRoles) {
		grants.push({
			spaceType: customRole.spaceType,
			customRoleKey: customRole.key,
		});
	}

	return grants;
};

const grantToMembershipWhere = (
	grant: PermissionGrant,
	filters: AdminUsersFilters,
): Prisma.UserWhereInput => ({
	spaceMembers: {
		some: {
			revokedAt: null,
			spaceType: grant.spaceType,
			...(grant.customRoleKey
				? { customRoleKey: grant.customRoleKey }
				: { role: grant.role, customRoleKey: null }),
			...(filters.role ? { role: filters.role } : {}),
		},
	},
});

export const buildAdminUsersWhere = (
	filters: AdminUsersFilters,
): Prisma.UserWhereInput => {
	const { search, spaceType, role, permissionGrants, experts } = filters;
	const where: Prisma.UserWhereInput[] = [];

	if (experts) {
		where.push({
			specialities: {
				some: {
					...landingExpertWhere,
					...(experts === "featured" ? { isFeatured: true } : {}),
				},
			},
		});
	}

	if (search) {
		where.push({
			OR: [
				{ name: { contains: search, mode: "insensitive" } },
				{ email: { contains: search, mode: "insensitive" } },
				{ profile: { name: { contains: search, mode: "insensitive" } } },
				{
					specialities: {
						some: { name: { contains: search, mode: "insensitive" } },
					},
				},
			],
		});
	}

	if (spaceType || role) {
		where.push({
			spaceMembers: {
				some: {
					revokedAt: null,
					...(spaceType ? { spaceType } : {}),
					...(role ? { role } : {}),
				},
			},
		});
	}

	if (permissionGrants) {
		// A space filter and a grant in another space cannot both hold.
		const applicable = spaceType
			? permissionGrants.filter((grant) => grant.spaceType === spaceType)
			: permissionGrants;

		where.push(
			applicable.length
				? {
						OR: applicable.map((grant) =>
							grantToMembershipWhere(grant, filters),
						),
					}
				: // Nothing grants it — the list must come back empty, not unfiltered.
					{ id: { in: [] } },
		);
	}

	return where.length ? { AND: where } : {};
};
