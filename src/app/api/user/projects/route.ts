import { ProjectStatus } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { CONFIRMED_MEMBERS } from "@/repositories/project/team";
import { prisma } from "@/services/prisma";

const UserProjectsQuerySchema = z.object({
	seasonId: z.string().optional(),
	status: z
		.enum(Object.values(ProjectStatus) as [string, ...string[]])
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
							// On the team today: not an applicant, a rejection or someone who left.
							members: {
								some: { ...CONFIRMED_MEMBERS, userId: currentUser.id },
							},
						},
					},
				],
				status: status ? { equals: status as ProjectStatus } : undefined,
			},
			select: {
				id: true,
				name: true,
				slug: true,
				description: true,
				status: true,
				coverImage: true,
				authorId: true,
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
