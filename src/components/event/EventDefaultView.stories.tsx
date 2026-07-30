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
import EventDefaultView from "./EventDefaultView";

type Props = ComponentProps<typeof EventDefaultView>;

/** Build props from the plain fixtures, casting once to the Prisma-derived types. */
function props(description: string, schedule = mockEventSchedule): Props {
	return {
		event: { ...mockEvent, description } as unknown as Props["event"],
		schedule: schedule as unknown as Props["schedule"],
		workDirections: mockWorkDirections as unknown as Props["workDirections"],
	};
}

/**
 * Event page body. `event.description` and every `schedule[].description` go
 * through react-markdown with `rehype-raw`, so raw HTML inside them renders.
 */
const meta: Meta<typeof EventDefaultView> = {
	title: "Components/Event/DefaultView",
	component: EventDefaultView,
	parameters: { layout: "padded" },
};

export default meta;

type Story = StoryObj<typeof EventDefaultView>;

/** Every markdown construct at once: lists, quote, table, images, raw HTML. */
export const Default: Story = {
	args: props(MARKDOWN_SHOWCASE),
};

/** Short description — the usual production case. */
export const ShortDescription: Story = {
	args: props(MARKDOWN_SHORT),
};

/** Raw HTML in the description; without `rehype-raw` it would show as text. */
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
