import { apiError, json, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const publicUser = { select: { id: true, name: true, image: true } };

export const GET = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const { id } = (await ctx.params) as { id: string };

	// Only the two parties read a request; anyone else gets the same answer as for a missing one.
	const adviceRequest = await prisma.adviceRequest.findFirst({
		where: {
			id,
			OR: [{ fromUserId: user.id }, { toUserId: user.id }],
		},
		select: {
			id: true,
			fromUserId: true,
			toUserId: true,
			projectId: true,
			topic: true,
			comment: true,
			feedback: true,
			status: true,
			createdAt: true,
			updatedAt: true,
			finishedAt: true,
			fromUser: publicUser,
			toUser: publicUser,
			project: { select: { id: true, name: true, slug: true } },
		},
	});

	if (!adviceRequest) return apiError.notFound();

	return json(adviceRequest);
});
