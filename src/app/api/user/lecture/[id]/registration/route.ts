import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export const POST = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	const lectureListener = await prisma.lectureListener.create({
		data: {
			lecture: { connect: { id } },
			user: { connect: { id: currentUser.id } },
		},
	});

	return json(lectureListener);
});
