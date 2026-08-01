import type { Metadata } from "next";
import {
	getPublishedStoreProjects,
	getWorkedProjects,
} from "@/services/prisma/queries";
import { type ProjectIncludeAll, ProjectsClient } from "./ProjectsClient";

export const revalidate = 60;

export const metadata: Metadata = {
	title: "Video Games",
	description: "Indie games that are developed by platform users and teams",
	alternates: { canonical: "/projects" },
	openGraph: {
		type: "website",
		url: "/projects",
		title: "Video Games",
		description: "Indie games that are developed by platform users and teams",
	},
};

const serializeDate = (d: Date | null | undefined) =>
	d ? d.toISOString() : null;

export default async function ProjectsPage() {
	const [projects, publishedProjects] = await Promise.all([
		getWorkedProjects(),
		getPublishedStoreProjects(),
	]);

	const serializedProjects = projects.map((p) => ({
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
		// The activity query projects the author as `{ name }` only — there are no
		// author timestamps to serialize.
		author: p.author,
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
