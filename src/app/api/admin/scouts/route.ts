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
import { createScout, listScouts } from "@/repositories/scout";

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

	return json(
		await createScout(
			userId,
			{ ...rest, type: type as ScoutTypeValue },
			currentUser.id,
		),
	);
});
