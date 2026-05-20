import {
	getPublishedStoreProjects,
	getWorkedProjects,
} from "@/services/prisma/queries";
import { type ProjectIncludeAll, ProjectsClient } from "./ProjectsClient";

export const revalidate = 60;

const serializeDate = (d: Date | null | undefined) =>
	d ? d.toISOString() : null;

export default async function ProjectsPage() {
	const projects = await getWorkedProjects();
	const publishedProjects = await getPublishedStoreProjects();

	const serializedProjects = projects.map((p: ProjectIncludeAll) => ({
		...p,
		createdAt: serializeDate(p.createdAt),
		updatedAt: serializeDate(p.updatedAt),
		startedAt: serializeDate(p.startedAt),
		finishedAt: serializeDate(p.finishedAt),
		dormantAt: serializeDate(p.dormantAt),
		statusChangedAt: serializeDate(p.statusChangedAt),
		archivedAt: serializeDate(p.archivedAt),
		killedWithDignityAt: serializeDate(p.killedWithDignityAt),
		lastPostAt: serializeDate(p.lastPostAt),
		firstPostAt: serializeDate(p.firstPostAt),
		author: {
			...p.author,
			createdAt: serializeDate(p.author.createdAt),
			updatedAt: serializeDate(p.author.updatedAt),
		},
		workflow: p.workflow || null,
	})) as unknown as ProjectIncludeAll[];

	return (
		<ProjectsClient
			projects={serializedProjects}
			publishedProjects={
				publishedProjects as unknown as Parameters<
					typeof ProjectsClient
				>[0]["publishedProjects"]
			}
		/>
	);
}
