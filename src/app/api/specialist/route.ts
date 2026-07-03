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

const SpecialistQuerySchema = z.object({
	id: z.string(),
});

type SpecialistQuery = z.infer<typeof SpecialistQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		SpecialistQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const { id } = body as SpecialistQuery;
		// withAuth({ mode: "user" }) guarantees `user` is present, but the
		// composed locals type erases that — narrow defensively.
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();

		const isAdmin = currentUser.roles?.includes(prismaClient.UserRole.Admin);
		const activeSubscription = await prisma.user.activeSubscription(
			currentUser.id,
		);

		const specialist = await prisma.speciality.findFirst({
			where: { id },
			include: {
				user: {
					select: {
						id: true,
						name: true,
						image: true,
						email: true,
						profile: {
							include: {
								preferredGenres: true,
								preferredLevels: true,
								preferredSettings: true,
							},
						},
					},
				},
				direction: true,
				availableProjects: activeSubscription
					? {
							where: !isAdmin
								? { project: { authorId: currentUser.id } }
								: undefined,
							include: { project: { select: { name: true } } },
						}
					: undefined,
			},
		});

		return json(specialist);
	}),
);
