import type { Metadata } from "next";
import NotionService from "@/services/notion";
import { ProjectRequirementsClient } from "./ProjectRequirementsClient";

export const revalidate = 60;

const TITLE =
	"Requirements for game projects published on the gdhub.io platform";

export const metadata: Metadata = {
	title: TITLE,
	alternates: { canonical: "/project-requirements" },
	openGraph: {
		type: "website",
		url: "/project-requirements",
		title: TITLE,
	},
};

// Replace with the real Notion block ID once the page is created in Notion.
const PROJECT_REQUIREMENTS_BLOCK_ID = "157dcc9e-9c9d-80c3-ab0a-e8d12035dc30";

export default async function ProjectRequirementsPage() {
	const blocks = await NotionService.blocks.children.list({
		block_id: PROJECT_REQUIREMENTS_BLOCK_ID,
	});

	return <ProjectRequirementsClient blocks={blocks} />;
}
