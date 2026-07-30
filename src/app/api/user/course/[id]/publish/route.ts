import { CourseStatus } from "@gdhub-io/gdhub-prisma";
import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export const PUT = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	await prisma.course.update({
		where: { id },
		data: {
			status: CourseStatus.Published,
			publishedAt: new Date().toISOString(),
		},
	});

	return json({ success: true });
});
