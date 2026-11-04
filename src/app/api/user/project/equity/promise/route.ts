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
import { projectOfEquityPromise } from "@/lib/space-ids";
import { scopeOf } from "@/services/access";
import { prisma } from "@/services/prisma";

const PromiseQuerySchema = z.object({
	promiseId: z.string().min(1),
});

type PromiseQuery = z.infer<typeof PromiseQuerySchema>;

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.equity.view",
		idFrom: projectOfEquityPromise,
	}),
	withValidation(PromiseQuerySchema, "query"),
)(async (_req, _ctx, { user, access, body }) => {
	const { promiseId } = body as PromiseQuery;
	const ownOnly = !!access && scopeOf(access, "project.equity.view") === "own";

	const promise = await prisma.equityPromise.findFirst({
		where: {
			id: promiseId,
			...(ownOnly ? { allocation: { ownerId: (user as SessionUser).id } } : {}),
		},
	});

	if (!promise) {
		return apiError.notFound("Promise not found");
	}

	return json(promise);
});
