import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { z } from "zod";
import { json, withAuth, withValidation } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const DevlogPostsQuerySchema = z.object({
	projectId: z.string().optional(),
});

type DevlogPostsQuery = z.infer<typeof DevlogPostsQuerySchema>;

export const GET = withAuth({
	mode: "user",
	roles: [prismaClient.UserRole.Admin],
})(
	withValidation(
		DevlogPostsQuerySchema,
		"query",
	)(async (_req, _ctx, { body }) => {
		const { projectId } = body as DevlogPostsQuery;
		const reports = await prisma.projectReport.findMany({
			where: projectId ? { projectId } : undefined,
			orderBy: {
				publishedAt: "desc",
			},
			include: {
				project: {
					select: {
						id: true,
						name: true,
						slug: true,
						coverImage: true,
					},
				},
				author: {
					select: {
						id: true,
						name: true,
						image: true,
					},
				},
			},
		});

		return json(reports);
	}),
);
