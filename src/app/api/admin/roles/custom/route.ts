import { z } from "zod";
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
	createCustomRole,
	UnknownPermissionsError,
} from "@/services/access/matrix-admin";

/**
 * The key ends up in `SpaceMember.customRoleKey` and in permission strings in
 * the audit log, so it is restricted to the same shape as a feature name.
 */
const KEY = /^[a-z][a-z0-9_]*$/;

const BodySchema = z.object({
	space: z.string(),
	spaceId: z.string().optional(),
	key: z.string().min(2).max(32).regex(KEY, "latin, snake_case"),
	title: z.string().min(1).max(64),
	permissions: z.array(z.string()),
});

export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.roles.manage" }),
	withValidation(BodySchema, "body"),
)(async (_req, _ctx, { body, user }) => {
	const { space, spaceId, key, title, permissions } = body as z.infer<
		typeof BodySchema
	>;

	if (!user) return apiError.unauthorized();
	if (!isSpaceType(space))
		return apiError.badRequest(`Unknown space "${space}"`);

	try {
		return json(
			await createCustomRole({
				spaceType: space as SpaceType,
				spaceId,
				key,
				title,
				permissions,
				actorUserId: user.id,
			}),
		);
	} catch (error) {
		if (error instanceof UnknownPermissionsError) {
			return apiError.badRequest(error.message);
		}
		throw error;
	}
});
