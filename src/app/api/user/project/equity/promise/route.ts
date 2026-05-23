import { z } from "zod";
import { apiError, json, withAuth, withValidation } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const PromiseQuerySchema = z.object({
	promiseId: z.string().min(1),
});

type PromiseQuery = z.infer<typeof PromiseQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		PromiseQuerySchema,
		"query",
	)(async (_req, _ctx, { body }) => {
		const { promiseId } = body as PromiseQuery;

		const promise = await prisma.equityPromise.findUnique({
			where: { id: promiseId },
		});

		if (!promise) {
			return apiError.notFound("Promise not found");
		}

		return json(promise);
	}),
);
