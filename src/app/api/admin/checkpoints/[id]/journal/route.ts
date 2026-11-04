import { apiError, json, pipe, withAuth } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { getJournalView } from "@/repositories/checkpoints/journal-view";

/** Frames 12.11.10–10h: one checkpoint's journal, as a conversation and by subject. */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.checkpoints.view" }),
)(async (_req, ctx) => {
	const { id } = (await ctx.params) as { id: string };
	const view = await getJournalView(id);
	return view ? json(view) : apiError.notFound();
});
