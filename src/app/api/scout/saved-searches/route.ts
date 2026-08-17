import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { getCabinet } from "@/repositories/scout";
import { prisma } from "@/services/prisma";

const SELECT = {
	id: true,
	name: true,
	query: true,
	interestTypes: true,
	platforms: true,
	genres: true,
	stages: true,
	alertEnabled: true,
} as const;

const CreateSchema = z.object({
	name: z.string().trim().min(1),
	query: z.string().trim().nullable().optional(),
	interestTypes: z.array(z.string()).default([]),
	platforms: z.array(z.string()).default([]),
	genres: z.array(z.string()).default([]),
	stages: z.array(z.string()).default([]),
});

type CreateBody = z.infer<typeof CreateSchema>;

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "scout.games.view" }),
)(async (_req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const cabinet = await getCabinet(currentUser.id);
	if (!cabinet) return apiError.notFound("Scout cabinet not found");

	return json(
		await prisma.scoutSavedSearch.findMany({
			where: { cabinetId: cabinet.id },
			orderBy: { createdAt: "desc" },
			select: SELECT,
		}),
	);
});

export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "scout.games.view" }),
	withValidation(CreateSchema),
)(async (_req, _ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const cabinet = await getCabinet(currentUser.id);
	if (!cabinet) return apiError.notFound("Scout cabinet not found");

	return json(
		await prisma.scoutSavedSearch.create({
			data: { cabinetId: cabinet.id, ...(body as CreateBody) },
			select: SELECT,
		}),
	);
});
