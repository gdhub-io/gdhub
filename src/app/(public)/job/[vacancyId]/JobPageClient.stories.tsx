import type { Meta, StoryObj } from "@storybook/nextjs";
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
		isAuthenticated: false,
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
		vacancy: vacancy(MARKDOWN_SHORT, { myTeamMemberId: "tm-1" }),
	},
};
