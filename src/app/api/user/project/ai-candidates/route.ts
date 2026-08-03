import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { getSpaceAccess, isStaff } from "@/services/access";
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

		const [hubAccess, hasActiveSubscription] = await Promise.all([
			getSpaceAccess("hub", null, currentUser),
			prisma.user.activeSubscription(currentUser.id),
		]);

		// Staff are not subject to the paywall.
		if (!hasActiveSubscription && !isStaff(hubAccess)) return json(null);

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
