import { apiError, json, pipe, withAuth } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { getJournal } from "@/repositories/curator-journal";
import { prisma } from "@/services/prisma";
import type { CuratorJournalEntryDto } from "@/types/checkpoints";

/** Frame 11.10: the AI curator's journal of one checkpoint. */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.checkpoints.view" }),
)(async (_req, ctx) => {
	const { id } = (await ctx.params) as { id: string };
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id },
		select: { id: true },
	});
	if (!checkpoint) return apiError.notFound();

	const entries = await getJournal(id);
	return json(
		entries.map((entry) => ({
			...entry,
			createdAt: entry.createdAt.toISOString(),
		})) satisfies CuratorJournalEntryDto[],
	);
});
