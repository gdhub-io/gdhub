import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { hasRun } from "@/lib/checkpoints/status";
import { chatAccessOf, viewerOf } from "@/repositories/checkpoints/viewer";
import { checkpointRoomFor } from "@/services/chat/checkpoint-room";

// Imports the server-side Matrix SDK via ensureChatRoom — keep dynamic
export const dynamic = "force-dynamic";

/**
 * The checkpoint's chat for whoever opens it: the curator or someone on the
 * team. Not behind the space guard — the curator has no role in the project,
 * so the right comes from the checkpoint.
 */
export const POST = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const caller = user as SessionUser | undefined;
	if (!caller) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	const checkpoint = await chatAccessOf(id, caller.id);
	if (!checkpoint?.curatorId) return apiError.notFound();

	// The room opens with the curator's yes; before that there is nobody to talk to.
	if (!hasRun(checkpoint.status)) return apiError.badRequest("notStarted");

	if (!viewerOf(checkpoint, caller.id)) return apiError.forbidden();

	const roomId = await checkpointRoomFor(id, caller.id);
	return roomId ? json({ roomId }) : apiError.notFound();
});
