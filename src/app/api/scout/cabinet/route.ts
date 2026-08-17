import { z } from "zod";
import { userSpacesCacheKey } from "@/app/api/user/spaces/route";
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
import { deleteScout, getCabinet, updateCabinet } from "@/repositories/scout";
import { cacheDelete } from "@/services/cache";

const nullableText = z.string().trim().nullable().optional();

const UpdateSchema = z.object({
	type: z.enum(Object.values(ScoutType) as [string, ...string[]]).optional(),
	organizationName: nullableText,
	logo: nullableText,
	about: nullableText,
	website: nullableText,
	isPublic: z.boolean().optional(),
	interestTypes: z.array(z.string()).optional(),
	platforms: z.array(z.string()).optional(),
	genres: z.array(z.string()).optional(),
	stages: z.array(z.string()).optional(),
	alertOnMatchingProjects: z.boolean().optional(),
	alertOnSavedSearches: z.boolean().optional(),
	alertMonthlyDigest: z.boolean().optional(),
});

type UpdateBody = z.infer<typeof UpdateSchema>;

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "scout.settings.view" }),
)(async (_req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const cabinet = await getCabinet(currentUser.id);
	if (!cabinet) return apiError.notFound("Scout cabinet not found");

	return json(cabinet);
});

export const PUT = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "scout.settings.manage" }),
	withValidation(UpdateSchema),
)(async (_req, _ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { type, ...rest } = body as UpdateBody;

	return json(
		await updateCabinet(currentUser.id, {
			...rest,
			type: type as ScoutTypeValue | undefined,
		}),
	);
});

/**
 * Closes the cabinet: the settings, the saved searches behind them and the
 * access to the space, all at once. Being a scout is the cabinet — leaving one
 * behind without the other is what makes a broken account.
 */
export const DELETE = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "scout.settings.manage" }),
)(async (_req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	await deleteScout(currentUser.id);

	// Otherwise the header keeps offering a cabinet that now 404s.
	await cacheDelete(userSpacesCacheKey(currentUser.id));

	return json({ ok: true });
});
