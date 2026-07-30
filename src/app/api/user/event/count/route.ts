import { EventStatus } from "@gdhub-io/gdhub-prisma";
import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export const GET = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const userCount = await prisma.event.count({
		where: {
			createdById: currentUser.id,
		},
	});

	const totalPublishedCount = await prisma.event.count({
		where: {
			status: {
				in: [EventStatus.Published, EventStatus.Archived],
			},
		},
	});

	return json({ userCount, totalPublishedCount });
});
