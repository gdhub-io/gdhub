import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import {
	deleteCustomRole,
	UnknownPermissionsError,
	updateCustomRole,
} from "@/services/access/matrix-admin";

const BodySchema = z.object({
	title: z.string().min(1).max(64).optional(),
	permissions: z.array(z.string()).optional(),
});

export const PUT = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.roles.manage" }),
	withValidation(BodySchema, "body"),
)(async (_req, ctx, { body, user }) => {
	const { id } = await ctx.params;
	const { title, permissions } = body as z.infer<typeof BodySchema>;

	if (!user) return apiError.unauthorized();
	if (typeof id !== "string") return apiError.badRequest("Missing role id");

	try {
		return json(
			await updateCustomRole({ id, title, permissions, actorUserId: user.id }),
		);
	} catch (error) {
		if (error instanceof UnknownPermissionsError) {
			return apiError.badRequest(error.message);
		}
		throw error;
	}
});

export const DELETE = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.roles.manage" }),
)(async (_req, ctx, { user }) => {
	const { id } = await ctx.params;

	if (!user) return apiError.unauthorized();
	if (typeof id !== "string") return apiError.badRequest("Missing role id");

	return json(await deleteCustomRole({ id, actorUserId: user.id }));
});
