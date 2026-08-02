import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { prisma } from "@/services/prisma";

export const DELETE = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.devlog_posts.manage" }),
)(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	await prisma.projectReport.delete({
		where: { id },
	});

	return json({ success: true });
});
