import { z } from "zod";
import { json, withAuth, withValidation } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const LinksQuerySchema = z.object({
	id: z.string(),
});

type LinksQuery = z.infer<typeof LinksQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		LinksQuerySchema,
		"query",
	)(async (_req, _ctx, { body }) => {
		const { id } = body as LinksQuery;

		const data = await prisma.project.findUnique({
			where: { id },
			select: { id: true, links: true },
		});

		return json(data?.links || []);
	}),
);
