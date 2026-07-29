import type { Meta, StoryObj } from "@storybook/nextjs";
import type { ComponentProps } from "react";
import {
	mockEvent,
	mockEventSchedule,
	mockWorkDirections,
} from "@/mocks/event";
import {
	MARKDOWN_IMAGES,
	MARKDOWN_INLINE_HTML,
	MARKDOWN_SHORT,
	MARKDOWN_SHOWCASE,
} from "@/mocks/markdown";
import EventConferenceOrGamelabView from "./EventConferenceOrGamelabView";

type Props = ComponentProps<typeof EventConferenceOrGamelabView>;

/** Build props from the plain fixtures, casting once to the Prisma-derived types. */
function props(description: string, schedule = mockEventSchedule): Props {
	return {
		event: {
			...mockEvent,
			type: "CONFERENCE",
			description,
		} as unknown as Props["event"],
		schedule: schedule as unknown as Props["schedule"],
		workDirections: mockWorkDirections as unknown as Props["workDirections"],
	};
}

/**
 * Conference / GameLab layout. Unlike the default view this one also passes
 * `remark-gfm`, so GFM tables in the description render as real tables.
 */
const meta: Meta<typeof EventConferenceOrGamelabView> = {
	title: "Components/Event/ConferenceOrGamelabView",
	component: EventConferenceOrGamelabView,
	parameters: { layout: "padded" },
};

export default meta;

type Story = StoryObj<typeof EventConferenceOrGamelabView>;

/** Everything at once — note the table renders here thanks to `remark-gfm`. */
export const Default: Story = {
	args: props(MARKDOWN_SHOWCASE),
};

/** Short description — the usual production case. */
export const ShortDescription: Story = {
	args: props(MARKDOWN_SHORT),
};

/** Raw HTML in the description; `skipHtml={false}` plus `rehype-raw` keeps it. */
export const RawHtmlDescription: Story = {
	args: props(MARKDOWN_INLINE_HTML),
};

/** Inline vs block images, the part most sensitive to a react-markdown upgrade. */
export const ImagesOnly: Story = {
	args: props(MARKDOWN_IMAGES),
};

/** No schedule items — only the description block is rendered. */
export const WithoutSchedule: Story = {
	args: props(MARKDOWN_SHOWCASE, []),
};
