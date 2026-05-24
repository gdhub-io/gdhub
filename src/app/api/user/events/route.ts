import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export const GET = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const events = await prisma.event.findMany({
		where: {
			createdById: currentUser.id,
		},
		include: {
			schedule: {
				include: {
					speakers: true,
				},
			},
		},
		orderBy: { createdAt: "asc" },
	});

	return json(events);
});
