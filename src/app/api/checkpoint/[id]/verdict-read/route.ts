import { json, pipe, withAuth } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { projectOfCheckpoint } from "@/lib/space-ids";
import { prisma } from "@/services/prisma";

/**
 * Someone on the team opened the previous checkpoint's verdict, which ticks the
 * first line of sprint 1. The first opening is the one kept: reading it again
 * a week later is not news.
 */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.checkpoints.view",
		idFrom: projectOfCheckpoint,
	}),
)(async (_req, ctx) => {
	const { id } = (await ctx.params) as { id: string };

	await prisma.projectCheckpoint.updateMany({
		where: { id, previousVerdictReadAt: null },
		data: { previousVerdictReadAt: new Date() },
	});

	return json(null);
});
