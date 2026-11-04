import type { Prisma } from "@gdhub-io/gdhub-prisma";
import { describe, expect, it } from "vitest";
import { SpaceRole } from "@/config/permissions/roles";
import {
	buildAdminUsersWhere,
	parseAdminUsersFilters,
} from "@/repositories/admin/users";
import { landingExpertWhere } from "@/repositories/content/landing";

const clauses = (where: Prisma.UserWhereInput): Prisma.UserWhereInput[] =>
	Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];

describe("parseAdminUsersFilters", () => {
	it("drops blank search and unknown space types or roles", () => {
		expect(
			parseAdminUsersFilters({
				search: "   ",
				spaceType: "galaxy",
				role: "wizard",
			}),
		).toEqual({ search: undefined, spaceType: undefined, role: undefined });
	});

	it("keeps a trimmed search, a known space type and a known role", () => {
		expect(
			parseAdminUsersFilters({
				search: "  ada  ",
				spaceType: "project",
				role: SpaceRole.Admin,
			}),
		).toEqual({
			search: "ada",
			spaceType: "project",
			role: SpaceRole.Admin,
		});
	});
});

describe("buildAdminUsersWhere", () => {
	it("returns an empty filter when nothing is requested", () => {
		expect(buildAdminUsersWhere({})).toEqual({});
	});

	it("searches name, email, profile name and specialization", () => {
		const [clause] = clauses(buildAdminUsersWhere({ search: "ada" }));

		expect(clause?.OR).toEqual([
			{ name: { contains: "ada", mode: "insensitive" } },
			{ email: { contains: "ada", mode: "insensitive" } },
			{ profile: { name: { contains: "ada", mode: "insensitive" } } },
			{
				specialities: {
					some: { name: { contains: "ada", mode: "insensitive" } },
				},
			},
		]);
	});

	it("matches space type and role within one live membership", () => {
		const [clause] = clauses(
			buildAdminUsersWhere({ spaceType: "project", role: SpaceRole.Owner }),
		);

		expect(clause).toEqual({
			spaceMembers: {
				some: {
					revokedAt: null,
					spaceType: "project",
					role: SpaceRole.Owner,
				},
			},
		});
	});

	it("turns permission grants into membership alternatives", () => {
		const [clause] = clauses(
			buildAdminUsersWhere({
				permissionGrants: [
					{ spaceType: "project", role: SpaceRole.Admin },
					{ spaceType: "project", customRoleKey: "marketer" },
				],
			}),
		);

		expect(clause?.OR).toEqual([
			{
				spaceMembers: {
					some: {
						revokedAt: null,
						spaceType: "project",
						role: SpaceRole.Admin,
						customRoleKey: null,
					},
				},
			},
			{
				spaceMembers: {
					some: {
						revokedAt: null,
						spaceType: "project",
						customRoleKey: "marketer",
					},
				},
			},
		]);
	});

	it("keeps only the grants that belong to the selected space type", () => {
		const where = buildAdminUsersWhere({
			spaceType: "project",
			permissionGrants: [
				{ spaceType: "project", role: SpaceRole.Admin },
				{ spaceType: "event", role: SpaceRole.Admin },
			],
		});
		const permissionClause = clauses(where).at(-1);

		expect(permissionClause?.OR).toHaveLength(1);
	});

	it("matches nobody when no membership grants the permission", () => {
		const [clause] = clauses(buildAdminUsersWhere({ permissionGrants: [] }));

		expect(clause).toEqual({ id: { in: [] } });
	});

	it("combines every filter with AND", () => {
		const where = buildAdminUsersWhere({
			search: "ada",
			spaceType: "hub",
			role: SpaceRole.Member,
			permissionGrants: [{ spaceType: "hub", role: SpaceRole.Member }],
		});

		expect(clauses(where)).toHaveLength(3);
	});
});

describe("the experts filter", () => {
	it("drops an unknown value", () => {
		expect(parseAdminUsersFilters({ experts: "gurus" }).experts).toBeUndefined();
	});

	// The same rule as the landing's strip, so the list shows exactly who can be featured.
	it("keeps landing experts, and only the featured ones when asked", () => {
		const experts = clauses(buildAdminUsersWhere({ experts: "experts" }));
		expect(experts).toEqual([
			{ specialities: { some: landingExpertWhere } },
		]);

		const featured = clauses(buildAdminUsersWhere({ experts: "featured" }));
		expect(featured).toEqual([
			{ specialities: { some: { ...landingExpertWhere, isFeatured: true } } },
		]);
	});
});
