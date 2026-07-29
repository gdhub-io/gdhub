import type { Meta, StoryObj } from "@storybook/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import {
	MARKDOWN_IMAGES,
	MARKDOWN_SHORT,
	MARKDOWN_SHOWCASE,
} from "@/mocks/markdown";
import { DevLogPublicWall } from "./index";

const PROJECT_ID = "prj-1";

function report(id: string, content: string, video?: string) {
	return {
		id,
		authorId: "usr-1",
		content,
		video,
		publishedAt: "2026-07-20T09:00:00.000Z",
		author: {
			name: "Dima Ivanou",
			image: "/images/team/team-member-1.png",
			profile: { name: "Dima Ivanou" },
			memberInTeams: [{ position: "Studio lead" }],
		},
	};
}

/**
 * The wall reads its posts through TanStack Query, so each story seeds the
 * cache under the exact query key instead of mocking the network. `staleTime`
 * is infinite in the Storybook client, so nothing refetches over axios.
 */
function withReports(reports: unknown[]) {
	const client = new QueryClient({
		defaultOptions: {
			queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
		},
	});
	client.setQueryData(["project-reports", PROJECT_ID], { data: reports });

	return (Story: () => ReactElement) => (
		<QueryClientProvider client={client}>
			<Story />
		</QueryClientProvider>
	);
}

const meta: Meta<typeof DevLogPublicWall> = {
	title: "Components/DevLogPublicWall",
	component: DevLogPublicWall,
	parameters: { layout: "padded" },
	args: { projectId: PROJECT_ID },
};

export default meta;

type Story = StoryObj<typeof DevLogPublicWall>;

/** Two posts: a full markdown showcase and a short update. */
export const Default: Story = {
	decorators: [
		withReports([
			report("rep-1", MARKDOWN_SHOWCASE),
			report("rep-2", MARKDOWN_SHORT),
		]),
	],
};

/** Post body is images only — exercises the custom `img` renderer. */
export const ImagePost: Story = {
	decorators: [withReports([report("rep-1", MARKDOWN_IMAGES)])],
};

/** Post with an attached video, rendered under the markdown body. */
export const WithVideo: Story = {
	decorators: [
		withReports([
			report(
				"rep-1",
				MARKDOWN_SHORT,
				"https://www.youtube.com/watch?v=dQw4w9WgXcQ",
			),
		]),
	],
};

/** No posts — the component renders nothing at all (returns `null`). */
export const Empty: Story = {
	decorators: [withReports([])],
};
