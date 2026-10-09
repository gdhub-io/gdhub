import { CheckpointStatus } from "@/config/prisma-enums";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { projectOfCheckpoint } from "@/lib/space-ids";
import { CONFIRMED_MEMBERS } from "@/repositories/scout.games";
import { checkpointRoomFor } from "@/services/chat/checkpoint-room";
import { prisma } from "@/services/prisma";

// Imports the server-side Matrix SDK via ensureChatRoom — keep dynamic
export const dynamic = "force-dynamic";

/**
 * The checkpoint's chat for whoever opens it: the curator or someone on the
 * team. A viewer of the space who is not on the team is not let into it.
 */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.checkpoints.view",
		idFrom: projectOfCheckpoint,
	}),
)(async (_req, ctx, { user }) => {
	const caller = user as SessionUser | undefined;
	if (!caller) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id },
		select: {
			status: true,
			curatorId: true,
			project: {
				select: {
					team: {
						select: {
							members: {
								where: { ...CONFIRMED_MEMBERS, userId: caller.id },
								select: { id: true },
							},
						},
					},
				},
			},
		},
	});
	if (!checkpoint?.curatorId) return apiError.notFound();

	// The room opens with the curator's yes; before that there is nobody to talk to.
	const started =
		checkpoint.status === CheckpointStatus.Active ||
		checkpoint.status === CheckpointStatus.Review ||
		checkpoint.status === CheckpointStatus.Closed;
	if (!started) return apiError.badRequest("notStarted");

	const onTeam = (checkpoint.project.team?.members.length ?? 0) > 0;
	if (!onTeam && checkpoint.curatorId !== caller.id) {
		return apiError.forbidden();
	}

	const roomId = await checkpointRoomFor(id, caller.id);
	return roomId ? json({ roomId }) : apiError.notFound();
});
