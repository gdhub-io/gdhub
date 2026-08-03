import { z } from "zod";
import { isSpaceType, SPACE_TYPES, type SpaceType } from "@/config/spaces";
import {
	apiError,
	json,
	pipe,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { readSpaceRoles } from "@/services/access/matrix-admin";

const QuerySchema = z.object({ space: z.string().optional() });

/** Roles and permissions of one space, plus the list of spaces to switch between. */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.roles.view" }),
	withValidation(QuerySchema, "query"),
)(async (_req, _ctx, { body }) => {
	const { space } = body as z.infer<typeof QuerySchema>;
	const requested = space ?? "hub";

	if (!isSpaceType(requested)) {
		return apiError.badRequest(`Unknown space "${requested}"`);
	}

	const view = await readSpaceRoles(requested as SpaceType);

	return json({ ...view, spaces: SPACE_TYPES });
});
