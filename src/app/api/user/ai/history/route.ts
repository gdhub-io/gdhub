import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export const GET = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const threads = await prisma.aIThread.findMany({
		where: { userId: currentUser.id },
		orderBy: { updatedAt: "desc" },
		select: {
			id: true,
			title: true,
			lastMessageAt: true,
			externalThreadId: true,
		},
	});

	return json(threads);
});
