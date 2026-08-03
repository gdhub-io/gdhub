import { z } from "zod";
import { isSpaceRole } from "@/config/permissions/roles";
import { isSpaceType, type SpaceType } from "@/config/spaces";
import {
	apiError,
	json,
	pipe,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import {
	resetSpaceRoles,
	setRolePermissions,
	UnknownPermissionsError,
} from "@/services/access/matrix-admin";

const BodySchema = z.object({
	space: z.string(),
	role: z.string(),
	permissions: z.array(z.string()),
});

const ResetSchema = z.object({ space: z.string() });

/** Rewrites the permissions of one base role in one space. */
export const PUT = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.roles.manage" }),
	withValidation(BodySchema, "body"),
)(async (_req, _ctx, { body, user }) => {
	const { space, role, permissions } = body as z.infer<typeof BodySchema>;

	if (!user) return apiError.unauthorized();
	if (!isSpaceType(space))
		return apiError.badRequest(`Unknown space "${space}"`);
	if (!isSpaceRole(role)) return apiError.badRequest(`Unknown role "${role}"`);

	try {
		const diff = await setRolePermissions({
			spaceType: space as SpaceType,
			role,
			permissions,
			actorUserId: user.id,
		});

		return json(diff);
	} catch (error) {
		if (error instanceof UnknownPermissionsError) {
			return apiError.badRequest(error.message);
		}
		throw error;
	}
});

/** Throws away every hand edit for a space and regenerates from the registry. */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.roles.manage" }),
	withValidation(ResetSchema, "body"),
)(async (_req, _ctx, { body, user }) => {
	const { space } = body as z.infer<typeof ResetSchema>;

	if (!user) return apiError.unauthorized();
	if (!isSpaceType(space))
		return apiError.badRequest(`Unknown space "${space}"`);

	return json(
		await resetSpaceRoles({
			spaceType: space as SpaceType,
			actorUserId: user.id,
		}),
	);
});
