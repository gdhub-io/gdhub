import { EventStatus } from "@gdhub-io/gdhub-prisma";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { prisma } from "@/services/prisma";

export const PUT = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "event.lifecycle.archive",
		idFrom: "params.id",
	}),
)(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };

	await prisma.event.update({
		where: { id },
		data: { status: EventStatus.Archived },
	});

	return json({ ok: true });
});
