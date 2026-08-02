import { ProjectStatus } from "@gdhub-io/gdhub-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

const spaceMemberFindUnique = vi.fn();
const customRoleFindMany = vi.fn();
const projectFindFirst = vi.fn();
const projectFindUnique = vi.fn();

vi.mock("@/services/prisma", () => ({
	prisma: {
		spaceMember: {
			findUnique: (...args: unknown[]) => spaceMemberFindUnique(...args),
		},
		spaceCustomRole: {
			findMany: (...args: unknown[]) => customRoleFindMany(...args),
		},
		project: {
			findFirst: (...args: unknown[]) => projectFindFirst(...args),
			findUnique: (...args: unknown[]) => projectFindUnique(...args),
		},
		event: { findUnique: vi.fn() },
		course: { findFirst: vi.fn() },
	},
}));

import { SpaceRole } from "@/config/permissions/roles";
import { getSpaceAccess } from "@/services/access";
import { codeSource, setMatrixSource } from "@/services/access/matrix-source";

const staff = { id: "u-staff", roles: [], onboardingDone: true };

/** Membership rows the resolver will find, keyed by space type. */
const membership = (rows: Record<string, unknown>) => {
	spaceMemberFindUnique.mockImplementation((args: any) =>
		Promise.resolve(rows[args.where.spaceType_spaceId_userId.spaceType] ?? null),
	);
};

beforeEach(() => {
	setMatrixSource(codeSource);
	spaceMemberFindUnique.mockReset();
	spaceMemberFindUnique.mockResolvedValue(null);
	customRoleFindMany.mockReset();
	customRoleFindMany.mockResolvedValue([]);
	projectFindFirst.mockReset();
	projectFindFirst.mockResolvedValue({
		id: "p1",
		authorId: "someone-else",
		team: { members: [] },
	});
	projectFindUnique.mockReset();
	projectFindUnique.mockResolvedValue({ status: ProjectStatus.Approved });
});

describe("custom roles", () => {
	it("replaces the matrix with its own permission set", async () => {
		membership({
			admin: {
				role: SpaceRole.Admin,
				customRoleKey: "marketer",
				revokedAt: null,
			},
		});
		customRoleFindMany.mockResolvedValue([
			{ spaceId: null, permissions: ["admin.posts.view", "admin.posts.manage"] },
		]);

		const access = await getSpaceAccess("admin", null, staff);

		expect(access.role).toBe(SpaceRole.Admin);
		expect([...access.permissions].sort()).toEqual([
			"admin.posts.manage",
			"admin.posts.view",
		]);
		// The base role would have granted these; the custom role does not.
		expect(access.permissions.has("admin.users.manage")).toBe(false);
	});

	it("drops permissions the space no longer declares", async () => {
		membership({
			admin: { role: SpaceRole.Member, customRoleKey: "hr", revokedAt: null },
		});
		customRoleFindMany.mockResolvedValue([
			{ spaceId: null, permissions: ["admin.users.view", "admin.users.destroy"] },
		]);

		const access = await getSpaceAccess("admin", null, staff);

		expect([...access.permissions]).toEqual(["admin.users.view"]);
	});

	it("grants nothing when the role was deleted", async () => {
		membership({
			admin: { role: SpaceRole.Admin, customRoleKey: "gone", revokedAt: null },
		});
		customRoleFindMany.mockResolvedValue([]);

		const access = await getSpaceAccess("admin", null, staff);

		// Still inside the space — but with none of the admin permissions the base
		// role would have handed back.
		expect(access.role).toBe(SpaceRole.Admin);
		expect([...access.permissions]).toEqual([]);
	});

	it("loses to a stronger role from another source", async () => {
		// Staff in the hub, and a narrow marketer membership in the admin space.
		membership({
			hub: { role: SpaceRole.Admin, customRoleKey: null, revokedAt: null },
			admin: {
				role: SpaceRole.Member,
				customRoleKey: "marketer",
				revokedAt: null,
			},
		});
		customRoleFindMany.mockResolvedValue([
			{ spaceId: null, permissions: ["admin.posts.view"] },
		]);

		const access = await getSpaceAccess("admin", null, staff);

		expect(access.role).toBe(SpaceRole.Admin);
		expect(access.permissions.has("admin.users.manage")).toBe(true);
	});

	it("prefers a role defined for this space over the type-wide template", async () => {
		membership({
			project: {
				role: SpaceRole.Member,
				customRoleKey: "marketer",
				revokedAt: null,
			},
		});
		customRoleFindMany.mockResolvedValue([
			{ spaceId: null, permissions: ["project.info.view"] },
			{ spaceId: "p1", permissions: ["project.info.edit"] },
		]);

		const access = await getSpaceAccess("project", "p1", {
			...staff,
			id: "u-marketer",
		});

		expect([...access.permissions]).toEqual(["project.info.edit"]);
	});
});
