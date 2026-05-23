import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export const GET = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	const lecture = await prisma.lecture.findFirst({
		where: { id },
		include: {
			listeners: { select: { id: true, lectureId: true } },
			lecturerRequests: {
				include: {
					user: {
						select: {
							id: true,
							name: true,
							image: true,
							specialities: { select: { id: true, name: true, level: true } },
						},
					},
				},
			},
		},
	});

	return json(lecture);
});
