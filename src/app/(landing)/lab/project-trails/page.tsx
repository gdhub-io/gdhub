import type { Metadata } from "next";
import { getPublicProjectTrails } from "@/repositories/project/trails";
import { ProjectTrailsClient } from "./ProjectTrailsClient";

export const revalidate = 300;

export const metadata: Metadata = {
	title: "Project Trails",
	description:
		"Every public GDHub project's road through its workflow stages and checkpoints.",
	robots: { index: false, follow: false },
};

export default async function ProjectTrailsPage() {
	return <ProjectTrailsClient paths={await getPublicProjectTrails()} />;
}
