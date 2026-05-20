import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const UserProjectsQuerySchema = z.object({
	seasonId: z.string().optional(),
	status: z
		.enum(Object.values(prismaClient.ProjectStatus) as [string, ...string[]])
		.optional(),
});

type UserProjectsQuery = z.infer<typeof UserProjectsQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		UserProjectsQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { status } = body as UserProjectsQuery;

		const projects = await prisma.project.findMany({
			where: {
				OR: [
					{ authorId: currentUser.id },
					{
						team: {
							members: {
								some: {
									userId: currentUser.id,
								},
							},
						},
					},
				],
				status: status
					? { equals: status as prismaClient.ProjectStatus }
					: undefined,
			},
			select: {
				id: true,
				name: true,
				slug: true,
				description: true,
				status: true,
				coverImage: true,
				author: { select: { name: true, image: true } },
				workflow: {
					select: {
						id: true,
						title: true,
						currentStep: true,
					},
				},
			},
		});

		return json(projects);
	}),
);
