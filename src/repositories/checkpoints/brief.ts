import { CheckpointStatus } from "@gdhub-io/gdhub-prisma";
import { prisma } from "@/services/prisma";

/**
 * The parts of the curator brief that the AI goal check and the curator's card
 * both read, so the two cannot describe the author or the last run differently.
 * No names: the curator meets the team on the first call.
 */

export const briefMemberSelect = {
	speciality: { select: { name: true, level: true, specialization: true } },
	user: {
		select: { profile: { select: { timeForWork: true, timezone: true } } },
	},
} as const;

/** What the author does, how well, and in their own words. */
export const briefAuthor = (founder: {
	speciality: { name: string; level: string; specialization: string | null };
}) => ({
	speciality: founder.speciality.name,
	level: founder.speciality.level,
	experience: founder.speciality.specialization?.trim() || null,
});

/** How the project's last closed checkpoint ended, this one aside. */
export const lastVerdict = async (projectId: string, checkpointId: string) => {
	const previous = await prisma.projectCheckpoint.findFirst({
		where: {
			projectId,
			id: { not: checkpointId },
			status: CheckpointStatus.Closed,
			verdict: { not: null },
		},
		orderBy: { decidedAt: "desc" },
		select: { verdict: true, verdictNote: true },
	});

	return previous?.verdict
		? { verdict: previous.verdict, note: previous.verdictNote }
		: null;
};
