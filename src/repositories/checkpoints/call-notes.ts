import { devlogWords } from "@/lib/checkpoints/curator-text";
import { dateOfDay } from "@/lib/checkpoints/plan";
import { sprintRange } from "@/lib/checkpoints/sprints";
import { prisma } from "@/services/prisma";
import type { CallNotes } from "@/types/checkpoints";
/**
 * What a sprint left to read: its latest devlog and the artifacts added in it.
 * The day after the sprint counts — a devlog posted the next morning is its.
 */
export const sprintEvidence = async (
	projectId: string,
	startedAt: Date,
	sprint: number,
) => {
	const range = sprintRange(startedAt, sprint);
	const inSprint = { gte: range.from, lt: dateOfDay(range.to, 2) };
	const [devlogs, artifacts] = await Promise.all([
		prisma.projectReport.findMany({
			where: { projectId, isSystem: false, publishedAt: inSprint },
			orderBy: { publishedAt: "asc" },
			select: { id: true, content: true, video: true, contentEditor: true },
		}),
		prisma.projectArtifact.findMany({
			where: { projectId, createdAt: inSprint },
			select: { type: true, name: true },
		}),
	]);
	return {
		devlogs: devlogs.map(devlogWords),
		posts: devlogs,
		artifacts,
	};
};

/** A task id the model made up points at nothing on the page: drop it. */
export const knownOnly = (
	notes: CallNotes,
	items: { id: string }[],
): CallNotes => {
	const known = new Set(items.map((item) => item.id));
	return {
		...notes,
		discussed: notes.discussed.filter((row) => known.has(row.itemId)),
		notDiscussed: notes.notDiscussed.filter((itemId) => known.has(itemId)),
		agreed: notes.agreed.map((row) => ({
			...row,
			itemId: row.itemId && known.has(row.itemId) ? row.itemId : null,
		})),
	};
};
