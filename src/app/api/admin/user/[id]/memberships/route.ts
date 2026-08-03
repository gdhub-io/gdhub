import { z } from "zod";
import { isSpaceRole } from "@/config/permissions/roles";
import { isSpaceType } from "@/config/spaces";
import {
	apiError,
	json,
	pipe,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { getSpaceAccess } from "@/services/access";
import {
	applyMembershipChanges,
	MembershipDeniedError,
	readUserMemberships,
} from "@/services/access/user-memberships";
import { prisma } from "@/services/prisma";

const ChangeSchema = z.object({
	space: z.string(),
	spaceId: z.string().optional(),
	/** `null` removes the membership. */
	role: z.string().nullable(),
	customRoleKey: z.string().nullable().optional(),
});

const BodySchema = z.object({ changes: z.array(ChangeSchema).min(1) });

/** Who the actor is in the hub — the ceiling for what they may hand out. */
const actorHubContext = async (userId: string) => {
	const actor = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, isSuperAdmin: true, roles: true, onboardingDone: true },
	});

	if (!actor) return null;

	const hub = await getSpaceAccess("hub", null, actor);

	return {
		isSuperAdmin: Boolean(actor.isSuperAdmin),
		hubRole: hub.role === "none" ? null : hub.role,
	};
};

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.users.view" }),
)(async (_req, ctx, { user }) => {
	const { id } = await ctx.params;

	if (!user) return apiError.unauthorized();
	if (typeof id !== "string") return apiError.badRequest("Missing user id");

	const actor = await actorHubContext(user.id);

	return json({
		memberships: await readUserMemberships(id, {
			canEditAnySpace: Boolean(actor?.isSuperAdmin),
		}),
		canEditAnySpace: Boolean(actor?.isSuperAdmin),
	});
});

export const PUT = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.users.manage" }),
	withValidation(BodySchema, "body"),
)(async (_req, ctx, { body, user }) => {
	const { id } = await ctx.params;
	const { changes: submitted } = body as z.infer<typeof BodySchema>;

	if (!user) return apiError.unauthorized();
	if (typeof id !== "string") return apiError.badRequest("Missing user id");

	const changes = [];

	for (const change of submitted) {
		if (!isSpaceType(change.space)) {
			return apiError.badRequest(`Unknown space "${change.space}"`);
		}
		if (change.role !== null && !isSpaceRole(change.role)) {
			return apiError.badRequest(`Unknown role "${change.role}"`);
		}

		changes.push({
			spaceType: change.space,
			spaceId: change.spaceId,
			role: change.role,
			customRoleKey: change.customRoleKey,
		});
	}

	const actor = await actorHubContext(user.id);

	try {
		return json(
			await applyMembershipChanges({
				userId: id,
				actorUserId: user.id,
				actorHubRole: actor?.hubRole ?? null,
				actorIsSuperAdmin: Boolean(actor?.isSuperAdmin),
				changes,
			}),
		);
	} catch (error) {
		if (error instanceof MembershipDeniedError) {
			return apiError.forbidden(error.message);
		}
		throw error;
	}
});
