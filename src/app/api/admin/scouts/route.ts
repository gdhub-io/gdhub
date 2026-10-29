import { z } from "zod";
import {
	ScoutType,
	type ScoutType as ScoutTypeValue,
} from "@/config/prisma-enums";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { createScout, listScouts } from "@/repositories/scout/scout";
import { userSpacesCacheKey } from "@/repositories/user/spaces";
import { cacheDelete } from "@/services/cache";

const CreateSchema = z.object({
	userId: z.string().min(1),
	type: z.enum(Object.values(ScoutType) as [string, ...string[]]),
	organizationName: z.string().trim().nullable().optional(),
	about: z.string().trim().nullable().optional(),
	website: z.string().trim().nullable().optional(),
	isPublic: z.boolean().optional(),
});

type CreateBody = z.infer<typeof CreateSchema>;

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.scouts.view" }),
)(async () => json(await listScouts()));

export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.scouts.manage" }),
	withValidation(CreateSchema),
)(async (_req, _ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { userId, type, ...rest } = body as CreateBody;

	const cabinet = await createScout(
		userId,
		{ ...rest, type: type as ScoutTypeValue },
		currentUser.id,
	);

	// The new scout's switcher, not the admin's: without this the cabinet is
	// invisible in their header until the 60s TTL lapses, and the person who
	// was just granted it has no way to know that is why.
	await cacheDelete(userSpacesCacheKey(userId));

	return json(cabinet);
});
