import { prisma } from "@/services/prisma";

/** How many faces the card's avatar stack shows before it turns into a count. */
export const PROJECT_CARD_AVATAR_LIMIT = 3;

export type ProjectCardMember = {
	name: string | null;
	image: string | null;
};

export type ProjectCardFacts = {
	author: { name: string | null; image: string | null } | null;
	team: { count: number; members: ProjectCardMember[] };
	stage: string | null;
};

/**
 * The foot of a project card: who runs it, how many people are on it, and where
 * it is in the workflow.
 *
 * Kept apart from the list query because that one comes from a Prisma extension
 * with no `include` — the same reason the routes already fetch applause counts
 * and open positions separately.
 */
export async function getProjectCardFacts(
	projectIds: string[],
): Promise<Map<string, ProjectCardFacts>> {
	if (!projectIds.length) return new Map();

	const [projects, teams] = await Promise.all([
		prisma.project.findMany({
			where: { id: { in: projectIds } },
			select: {
				id: true,
				author: { select: { name: true, image: true } },
				workflow: { select: { currentStep: { select: { name: true } } } },
			},
		}),
		prisma.team.findMany({
			where: { projectId: { in: projectIds } },
			select: {
				projectId: true,
				members: {
					// Founders and hired members are the team; applicants and the
					// people who left are not.
					where: { status: { in: ["Founder", "Hired"] }, finishedAt: null },
					select: { user: { select: { name: true, image: true } } },
					orderBy: { startedAt: "asc" },
				},
			},
		}),
	]);

	const teamByProjectId = new Map(
		teams.flatMap((team) => (team.projectId ? [[team.projectId, team]] : [])),
	);

	return new Map(
		projects.map((project) => {
			const members = teamByProjectId.get(project.id)?.members ?? [];

			return [
				project.id,
				{
					author: project.author ?? null,
					team: {
						count: members.length,
						members: members
							.slice(0, PROJECT_CARD_AVATAR_LIMIT)
							.map(({ user }) => ({ name: user.name, image: user.image })),
					},
					stage: project.workflow?.currentStep?.name ?? null,
				},
			];
		}),
	);
}
