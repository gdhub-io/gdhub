import { beforeEach, describe, expect, it, vi } from "vitest";

const spaceMemberUpsert = vi.fn();
const spaceMemberUpdateMany = vi.fn();
const spaceMemberUpdate = vi.fn();
const auditLogCreate = vi.fn();

vi.mock("@/services/prisma", () => ({
	prisma: {
		spaceMember: {
			upsert: (...args: unknown[]) => spaceMemberUpsert(...args),
			updateMany: (...args: unknown[]) => spaceMemberUpdateMany(...args),
			update: (...args: unknown[]) => spaceMemberUpdate(...args),
			findMany: vi.fn().mockResolvedValue([]),
		},
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

beforeEach(() => {
	spaceMemberUpsert.mockReset().mockResolvedValue({});
	spaceMemberUpdateMany.mockReset().mockResolvedValue({ count: 1 });
	spaceMemberUpdate.mockReset().mockResolvedValue({});
	auditLogCreate.mockReset().mockResolvedValue({});
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
