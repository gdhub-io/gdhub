import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";
import { adviceRequestSelect, buildAdviceRequestContext } from "../_helpers";

export const GET = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id: matrixRoomId } = (await ctx.params) as { id: string };

	const adviceRequest = await prisma.adviceRequest.findFirst({
		where: {
			matrixRoomId,
		},
		select: adviceRequestSelect,
	});

	if (adviceRequest) {
		return json({
			...buildAdviceRequestContext(adviceRequest, currentUser.id),
		});
	}

	return json({
		type: "default",
		data: null,
	});
});
