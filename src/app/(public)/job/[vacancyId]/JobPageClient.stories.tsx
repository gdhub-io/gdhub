import type { Meta, StoryObj } from "@storybook/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import type { ReactElement } from "react";
import {
	MARKDOWN_IMAGES,
	MARKDOWN_SHORT,
	MARKDOWN_SHOWCASE,
} from "@/mocks/markdown";
import { mockProject, mockVacancy } from "@/mocks/project";
import { JobPageClient, type JobPageProps } from "./JobPageClient";

/**
 * The vacancy page renders the *project* description through react-markdown
 * (truncated to 700 characters); the vacancy description itself is plain text.
 * No `rehype-raw` here, so raw HTML in the description stays escaped — that is
 * the current behaviour, not a broken story.
 */
function vacancy(
	projectDescription: string,
	extra: Record<string, unknown> = {},
): JobPageProps["vacancy"] {
	return {
		...mockVacancy,
		...extra,
		team: { project: { ...mockProject, description: projectDescription } },
	} as unknown as JobPageProps["vacancy"];
}

const meta: Meta<typeof JobPageClient> = {
	title: "Pages/Job",
	component: JobPageClient,
	parameters: { layout: "fullscreen" },
	args: {
		vacancy: vacancy(MARKDOWN_SHOWCASE),
		pageCover: "/images/new-project.png",
	},
};

export default meta;

type Story = StoryObj<typeof JobPageClient>;

/** Long project description — react-markdown gets the truncated string. */
export const Default: Story = {};

/** Short description, no truncation. */
export const ShortDescription: Story = {
	args: { vacancy: vacancy(MARKDOWN_SHORT) },
};

/** Images inside the project description. */
export const ImagesInDescription: Story = {
	args: { vacancy: vacancy(MARKDOWN_IMAGES) },
};

/** Paid vacancy instead of the equity one. */
export const PaidVacancy: Story = {
	args: {
		vacancy: vacancy(MARKDOWN_SHORT, {
			promisePercentage: 0,
			offeredAmount: 2500,
			offeredRateType: "Monthly",
		}),
	},
};

/** The viewer already applied — the page offers to withdraw. */
export const AlreadyApplied: Story = {
	args: {
		vacancy: vacancy(MARKDOWN_SHORT),
	},
	decorators: [
		(Story: () => ReactElement) => {
			const viewer = {
				expires: "2099-01-01T00:00:00.000Z",
				user: { id: "viewer-1", name: "Viewer", email: "viewer@gdhub.io" },
			} as Session;
			const client = new QueryClient({
				defaultOptions: { queries: { staleTime: Number.POSITIVE_INFINITY } },
			});
			client.setQueryData(
				["vacancy-my-application", mockVacancy.id, viewer.user.id],
				"tm-1",
			);

			return (
				<SessionProvider session={viewer}>
					<QueryClientProvider client={client}>
						<Story />
					</QueryClientProvider>
				</SessionProvider>
			);
		},
	],
};
