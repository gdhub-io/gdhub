import { beforeEach, describe, expect, it, vi } from "vitest";

const spaceMemberUpsert = vi.fn();
const spaceMemberUpdateMany = vi.fn();
const spaceMemberUpdate = vi.fn();
const spaceMemberFindUnique = vi.fn();
const userFindUnique = vi.fn();
const auditLogCreate = vi.fn();

vi.mock("@/services/prisma", () => ({
	prisma: {
		spaceMember: {
			upsert: (...args: unknown[]) => spaceMemberUpsert(...args),
			updateMany: (...args: unknown[]) => spaceMemberUpdateMany(...args),
			update: (...args: unknown[]) => spaceMemberUpdate(...args),
			findUnique: (...args: unknown[]) => spaceMemberFindUnique(...args),
			findMany: vi.fn().mockResolvedValue([]),
		},
		user: { findUnique: (...args: unknown[]) => userFindUnique(...args) },
		auditLog: { create: (...args: unknown[]) => auditLogCreate(...args) },
		project: { findMany: vi.fn().mockResolvedValue([]) },
		event: { findMany: vi.fn().mockResolvedValue([]) },
		course: { findMany: vi.fn().mockResolvedValue([]) },
	},
}));

import { SpaceRole } from "@/config/permissions/roles";
import {
	applyMembershipChanges,
	MembershipDeniedError,
} from "@/services/access/user-memberships";

const admin = {
	userId: "target",
	actorUserId: "actor",
	actorHubRole: SpaceRole.Admin,
	actorIsSuperAdmin: false,
};

/** What the person being edited currently is. */
const target = (
	hubRole: SpaceRole | null,
	{ isSuperAdmin = false }: { isSuperAdmin?: boolean } = {},
) => {
	spaceMemberFindUnique.mockResolvedValue(
		hubRole ? { role: hubRole, revokedAt: null } : null,
	);
	userFindUnique.mockResolvedValue({ isSuperAdmin });
};

beforeEach(() => {
	spaceMemberUpsert.mockReset().mockResolvedValue({});
	spaceMemberUpdateMany.mockReset().mockResolvedValue({ count: 1 });
	spaceMemberUpdate.mockReset().mockResolvedValue({});
	auditLogCreate.mockReset().mockResolvedValue({});
	spaceMemberFindUnique.mockReset();
	userFindUnique.mockReset();
	// By default the target is an ordinary member — someone an admin may edit.
	target(SpaceRole.Member);
});

describe("applyMembershipChanges", () => {
	it("lets an admin staff the hub", async () => {
		const result = await applyMembershipChanges({
			...admin,
			changes: [{ spaceType: "hub", role: SpaceRole.Member }],
		});

		expect(result.applied).toBe(1);
		expect(spaceMemberUpsert).toHaveBeenCalledOnce();
	});

	it("refuses to hand out a role stronger than the actor's own", async () => {
		await expect(
			applyMembershipChanges({
				...admin,
				changes: [{ spaceType: "hub", role: SpaceRole.Owner }],
			}),
		).rejects.toBeInstanceOf(MembershipDeniedError);

		expect(spaceMemberUpsert).not.toHaveBeenCalled();
	});

	it("refuses every change when one of them is not allowed", async () => {
		await expect(
			applyMembershipChanges({
				...admin,
				changes: [
					{ spaceType: "hub", role: SpaceRole.Member },
					{ spaceType: "hub", role: SpaceRole.Owner },
				],
			}),
		).rejects.toBeInstanceOf(MembershipDeniedError);

		expect(spaceMemberUpsert).not.toHaveBeenCalled();
	});

	it("keeps staff out of someone's project", async () => {
		await expect(
			applyMembershipChanges({
				...admin,
				changes: [
					{ spaceType: "project", spaceId: "p1", role: SpaceRole.Owner },
				],
			}),
		).rejects.toBeInstanceOf(MembershipDeniedError);
	});

	it("lets the super-admin change a project membership", async () => {
		const result = await applyMembershipChanges({
			...admin,
			actorIsSuperAdmin: true,
			changes: [{ spaceType: "project", spaceId: "p1", role: SpaceRole.Owner }],
		});

		expect(result.applied).toBe(1);
	});

	it("does not let an admin edit their own roles", async () => {
		await expect(
			applyMembershipChanges({
				...admin,
				userId: admin.actorUserId,
				changes: [{ spaceType: "hub", role: SpaceRole.Admin }],
			}),
		).rejects.toBeInstanceOf(MembershipDeniedError);
	});

	it("revokes instead of deleting when the role is null", async () => {
		await applyMembershipChanges({
			...admin,
			changes: [{ spaceType: "hub", role: null }],
		});

		expect(spaceMemberUpdateMany).toHaveBeenCalledOnce();
		expect(spaceMemberUpsert).not.toHaveBeenCalled();
	});

	it("writes an audit entry naming both the actor and the subject", async () => {
		await applyMembershipChanges({
			...admin,
			changes: [{ spaceType: "hub", role: SpaceRole.Member }],
		});

		expect(auditLogCreate).toHaveBeenCalledOnce();
		expect(auditLogCreate.mock.calls[0]?.[0]?.data).toMatchObject({
			actorUserId: "actor",
			subjectUserId: "target",
			entity: "space_membership",
		});
	});

	it("does not let an admin demote another admin", async () => {
		target(SpaceRole.Admin);

		await expect(
			applyMembershipChanges({
				...admin,
				changes: [{ spaceType: "hub", role: SpaceRole.Guest }],
			}),
		).rejects.toBeInstanceOf(MembershipDeniedError);

		expect(spaceMemberUpsert).not.toHaveBeenCalled();
	});

	it("does not let an admin revoke another admin — removal carries no role", async () => {
		target(SpaceRole.Admin);

		await expect(
			applyMembershipChanges({
				...admin,
				changes: [{ spaceType: "hub", role: null }],
			}),
		).rejects.toBeInstanceOf(MembershipDeniedError);

		expect(spaceMemberUpdateMany).not.toHaveBeenCalled();
	});

	it("does not let an admin touch the owner", async () => {
		target(SpaceRole.Owner);

		await expect(
			applyMembershipChanges({
				...admin,
				changes: [{ spaceType: "hub", role: SpaceRole.Member }],
			}),
		).rejects.toBeInstanceOf(MembershipDeniedError);
	});

	it("does not let an admin touch a super-admin", async () => {
		target(SpaceRole.Member, { isSuperAdmin: true });

		await expect(
			applyMembershipChanges({
				...admin,
				changes: [{ spaceType: "hub", role: SpaceRole.Guest }],
			}),
		).rejects.toBeInstanceOf(MembershipDeniedError);
	});

	it("lets the owner demote an admin", async () => {
		target(SpaceRole.Admin);

		const result = await applyMembershipChanges({
			...admin,
			actorHubRole: SpaceRole.Owner,
			changes: [{ spaceType: "hub", role: SpaceRole.Member }],
		});

		expect(result.applied).toBe(1);
	});

	it("lets the super-admin touch anyone", async () => {
		target(SpaceRole.Owner, { isSuperAdmin: true });

		const result = await applyMembershipChanges({
			...admin,
			actorIsSuperAdmin: true,
			changes: [{ spaceType: "hub", role: SpaceRole.Guest }],
		});

		expect(result.applied).toBe(1);
	});

	it("lets an admin staff someone who has no hub membership yet", async () => {
		target(null);

		const result = await applyMembershipChanges({
			...admin,
			changes: [{ spaceType: "hub", role: SpaceRole.Member }],
		});

		expect(result.applied).toBe(1);
	});

	it("treats a revoked membership as no rank at all", async () => {
		spaceMemberFindUnique.mockResolvedValue({
			role: SpaceRole.Admin,
			revokedAt: new Date(),
		});
		userFindUnique.mockResolvedValue({ isSuperAdmin: false });

		const result = await applyMembershipChanges({
			...admin,
			changes: [{ spaceType: "hub", role: SpaceRole.Member }],
		});

		expect(result.applied).toBe(1);
	});

	it("refuses everything when the actor has no hub role at all", async () => {
		await expect(
			applyMembershipChanges({
				...admin,
				actorHubRole: null,
				changes: [{ spaceType: "hub", role: SpaceRole.Guest }],
			}),
		).rejects.toBeInstanceOf(MembershipDeniedError);
	});
});
