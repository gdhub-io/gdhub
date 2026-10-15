import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/services/prisma";
import { ProjectPageClient, type ProjectPageParams } from "./ProjectPageClient";

type Params = Promise<{ projectSlug: string }>;

const loadProject = cache(async (projectSlug: string) => {
	const project = await prisma.project.findFirst({
		where: { slug: projectSlug },
		include: {
			author: {
				select: {
					name: true,
					image: true,
					profile: {
						select: { name: true, tgNickname: true, motivation: true },
					},
					specialities: {
						select: { name: true, specialization: true, level: true },
						take: 1,
					},
				},
			},
			team: { select: { id: true } },
			workflow: { select: { currentStep: { select: { name: true } } } },
		},
	});
	if (!project) return null;

	const applauseSummary = await prisma.project.getApplauseSummary({
		projectId: project.id,
	});

	return { project, applauseSummary };
});

// Rendered on the first visit, then served from cache and refreshed at most
// every 60 seconds.
export const revalidate = 60;

export async function generateStaticParams() {
	return [];
}

export async function generateMetadata({
	params,
}: {
	params: Params;
}): Promise<Metadata> {
	const { projectSlug } = await params;
	const result = await loadProject(projectSlug);
	if (!result) return { title: "Project" };
	const { project } = result;
	const ogImage = `${process.env.NEXT_PUBLIC_APP_URL}/api/og?t=${encodeURIComponent(project.name || "")}&st=${encodeURIComponent(`Author ${project.author.name ?? ""}`)}&img=${encodeURIComponent(project.coverImage || "")}`;
	return {
		title: project.name || undefined,
		description: project.description?.slice(0, 160) || undefined,
		alternates: { canonical: `/project/${projectSlug}` },
		openGraph: {
			type: "article",
			url: `/project/${projectSlug}`,
			title: project.name || undefined,
			description: project.description?.slice(0, 160) || undefined,
			images: project.coverImage
				? [{ url: ogImage, alt: `${project.name} cover image` }]
				: undefined,
		},
	};
}

export default async function ProjectPage({ params }: { params: Params }) {
	const { projectSlug } = await params;
	if (typeof projectSlug !== "string") notFound();

	const result = await loadProject(projectSlug);
	if (!result) notFound();
	const { project, applauseSummary } = result;

	const serialized: ProjectPageParams["project"] = {
		...project,
		createdAt: project.createdAt.toISOString(),
		updatedAt: project.updatedAt.toISOString(),
		startedAt: project.startedAt ? project.startedAt.toISOString() : null,
		finishedAt: project.finishedAt ? project.finishedAt.toISOString() : null,
		archivedAt: project.archivedAt ? project.archivedAt.toISOString() : null,
		killedWithDignityAt: project.killedWithDignityAt
			? project.killedWithDignityAt.toISOString()
			: null,
		dormantAt: project.dormantAt ? project.dormantAt.toISOString() : null,
		statusChangedAt: project.statusChangedAt
			? project.statusChangedAt.toISOString()
			: null,
		workflow: project.workflow
			? {
					...project.workflow,
					currentStep: project.workflow.currentStep || null,
				}
			: null,
	} as ProjectPageParams["project"];

	return (
		<ProjectPageClient
			project={serialized}
			projectApplauseCount={applauseSummary.total}
			seo={{
				title: project.name || null,
				description: project.description?.slice(0, 160) || null,
				image: `${process.env.NEXT_PUBLIC_APP_URL}/api/og?t=${project.name}&st=Author%20${project.author.name}&img=${project.coverImage}`,
			}}
		/>
	);
}
