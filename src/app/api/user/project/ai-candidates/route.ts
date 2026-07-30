import { UserRole } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const AiCandidatesQuerySchema = z.object({
	projectId: z.string(),
});

type AiCandidatesQuery = z.infer<typeof AiCandidatesQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		AiCandidatesQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { projectId } = body as AiCandidatesQuery;

		const isAdmin = currentUser.roles?.includes(UserRole.Admin);
		const hasActiveSubscription = await prisma.user.activeSubscription(
			currentUser.id,
		);

		if (!hasActiveSubscription && !isAdmin) return json(null);

		const specialists = await prisma.matchingSpecialistAndProject.findMany({
			where: {
				projectId,
				avgScore: { gte: 75 },
				specialist: {
					user: { memberInTeams: { none: {} }, profile: { isActive: true } },
				},
			},
			include: {
				specialist: {
					include: { user: { select: { id: true, name: true, image: true } } },
				},
			},
			orderBy: { avgScore: "desc" },
		});

		return json(specialists);
	}),
);
