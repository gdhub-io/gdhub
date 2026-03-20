import { prisma } from ".";

export const getWorkedProjects = async () => {
	const projects = await prisma.project.getProjectsOrderedByActivity({
		order: "desc",
	});

	return await Promise.all(
		projects.map(async (project) => ({
			...project,
			applauseCount: await prisma.project.getApplauseCount({
				projectId: project.id,
			}),
		})),
	);
};
