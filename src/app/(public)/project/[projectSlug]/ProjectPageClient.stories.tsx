import type { Meta, StoryObj } from "@storybook/nextjs";
import {
	MARKDOWN_IMAGES,
	MARKDOWN_SHORT,
	MARKDOWN_SHOWCASE,
} from "@/mocks/markdown";
import { mockProject } from "@/mocks/project";
import { ProjectPageClient, type ProjectPageParams } from "./ProjectPageClient";

/** Cast the plain fixture once to the Prisma-derived project prop. */
function project(description: string): ProjectPageParams["project"] {
	return {
		...mockProject,
		description,
	} as unknown as ProjectPageParams["project"];
}

/**
 * Public project page. `project.description` is rendered by react-markdown with
 * `rehype-raw` inside an Ant Design `Paragraph`. Sidebar widgets (team,
 * vacancies, devlog) fetch over axios and stay empty in Storybook.
 */
const meta: Meta<typeof ProjectPageClient> = {
	title: "Pages/Project",
	component: ProjectPageClient,
	parameters: { layout: "fullscreen" },
	args: {
		project: project(MARKDOWN_SHOWCASE),
		projectApplauseCount: 128,
	},
};

export default meta;

type Story = StoryObj<typeof ProjectPageClient>;

/** Every markdown construct at once. */
export const Default: Story = {};

/** Short description — the usual production case. */
export const ShortDescription: Story = {
	args: { project: project(MARKDOWN_SHORT) },
};

/** Inline vs block images inside the description. */
export const ImagesInDescription: Story = {
	args: { project: project(MARKDOWN_IMAGES) },
};

/** Empty description — the markdown block collapses to nothing. */
export const WithoutDescription: Story = {
	args: { project: project("") },
};
