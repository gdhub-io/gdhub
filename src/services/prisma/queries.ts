import { prisma } from ".";

export const getWorkedProjects = async () => {
	const projects = await prisma.project.getProjectsOrderedByActivity({
		order: "desc",
	});

	return projects;
};
