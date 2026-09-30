import type { Meta, StoryObj } from "@storybook/nextjs";
import { EmptyConversation } from "../ChatConversation";
import { conversationFixture, messageFixture } from "../fixtures/timeline";
import { buildTimeline } from "../model/timeline";
import { ChatTimeline } from "./index";

const long = buildTimeline(
	Array.from({ length: 40 }, (_, i) =>
		messageFixture({
			id: `l${i}`,
			own: i % 3 === 0,
			senderId: i % 3 === 0 ? "me" : "anna",
			status: i % 3 === 0 ? "read" : undefined,
			ts: Date.now() - (40 - i) * 7 * 60_000,
			text: `Message ${i + 1}`,
		}),
	),
);

const meta: Meta<typeof ChatTimeline> = {
	title: "Chat/ChatTimeline",
	component: ChatTimeline,
	parameters: { layout: "centered" },
	args: { items: buildTimeline(conversationFixture) },
	decorators: [
		(Story) => (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					width: 520,
					height: 600,
					background: "var(--gd-color-surface)",
					border: "1px solid var(--gd-color-border)",
				}}
			>
				<Story />
			</div>
		),
	],
};

export default meta;

type Story = StoryObj<typeof ChatTimeline>;

/** Frame `YGPUq`: day separators, groups, a notice, every delivery state. */
export const Conversation: Story = {};

/** Frame `S9DaOJ`: scroll up — older history loads at the top, jump-to-latest appears. */
export const LongHistory: Story = {
	args: { items: long, canLoadEarlier: true, onLoadEarlier: () => undefined },
};

export const LoadingEarlier: Story = {
	args: { items: long, canLoadEarlier: true, loadingEarlier: true },
};

/** Frame `u8M7E`. */
export const Empty: Story = {
	args: { items: [], empty: <EmptyConversation name="Anna Volkova" /> },
};
